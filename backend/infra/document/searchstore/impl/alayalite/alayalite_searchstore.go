/*
 * Copyright 2025 coze-dev Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package alayalite

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"time"

	"github.com/cloudwego/eino/components/indexer"
	"github.com/cloudwego/eino/components/retriever"
	"github.com/cloudwego/eino/schema"
	"github.com/coze-dev/coze-studio/backend/infra/alayalite"
	"github.com/coze-dev/coze-studio/backend/pkg/lang/ptr"
	"github.com/coze-dev/coze-studio/backend/pkg/lang/slices"
	"github.com/coze-dev/coze-studio/backend/pkg/logs"
)

type alayaliteSearchStore struct {
	manager        *alayaliteManager
	collectionName string
}

func (s *alayaliteSearchStore) Store(ctx context.Context, docs []*schema.Document, opts ...indexer.Option) ([]string, error) {
	if len(docs) == 0 {
		return []string{}, nil
	}
	startTime := time.Now()
	defer func() {
		logs.CtxInfof(ctx, "Store operation completed in %v for %d documents",
			time.Since(startTime), len(docs))
	}()

	var ids []string
	var items []alayalite.InsertItem

	for _, doc := range docs {
		content := ExtractContent(doc)
		if content == "" {
			logs.CtxWarnf(ctx, "Document %s has no content, skipping", doc.ID)
			continue
		}

		embeddings, err := s.manager.config.Embedding.EmbedStrings(ctx, []string{content})
		if err != nil {
			return nil, fmt.Errorf("[Store] failed to embed document: %w", err)
		}

		if len(embeddings) == 0 {
			logs.CtxWarnf(ctx, "Failed to generate embedding for document %s", doc.ID)
			continue
		}

		metadata := BuildMetadata(doc)

		item := alayalite.InsertItem{
			ID:      doc.ID,
			Text:    content,
			Vector:  ConvertToFloat32(embeddings[0]),
			Payload: metadata,
		}
		items = append(items, item)
		ids = append(ids, doc.ID)
	}

	if len(items) > 0 {
		for _, part := range slices.Chunks(items, MaxStoreBatch) {
			if err := s.manager.config.Client.InsertCollection(ctx, s.collectionName, part); err != nil {
				return nil, fmt.Errorf("[Store] failed to insert vector data: %w", err)
			}
		}
	}

	logs.CtxInfof(ctx, "Stored %d documents to AlayaLite collection: %s", len(ids), s.collectionName)

	err := s.manager.config.Client.SaveCollectionRequest(ctx, s.collectionName)
	if err != nil {
		return nil, fmt.Errorf("[Store] failed to save collection: %w", err)
	}

	return ids, nil
}

func (s *alayaliteSearchStore) Retrieve(ctx context.Context, query string, opts ...retriever.Option) ([]*schema.Document, error) {
	startTime := time.Now()
	defer func() {
		logs.CtxInfof(ctx, "Retrieve operation completed in %v", time.Since(startTime))
	}()

	options := retriever.GetCommonOptions(&retriever.Options{TopK: ptr.Of(int(TopK))}, opts...)
	embeddings, err := s.manager.config.Embedding.EmbedStrings(ctx, []string{query})
	if err != nil {
		return nil, fmt.Errorf("[Retrieve] failed to embed query: %w", err)
	}

	if len(embeddings) == 0 {
		return nil, fmt.Errorf("[Retrieve] failed to generate embedding for query")
	}
	results, err := s.manager.config.Client.QueryCollection(
		ctx,
		s.collectionName,
		[][]float32{ConvertToFloat32(embeddings[0])},
		ptr.From(options.TopK),
		efSearch,
		numThreads,
	)
	if err != nil {
		return nil, fmt.Errorf("[Retrieve] failed to search vectors: %w", err)
	}
	logs.CtxInfof(ctx, "AlayaLite returned %d results", len(results.Document[0]))

	minDistance := math.MaxFloat64
	maxDistance := 0.0
	for _, distance := range results.Distance[0] {
		minDistance = min(minDistance, distance)
		maxDistance = max(maxDistance, distance)
	}
	base := maxDistance - minDistance

	documents := make([]*schema.Document, 0, len(results.Document[0]))
	for i, ids := range results.ID[0] {

		doc := &schema.Document{
			ID:       strconv.FormatFloat(ids, 'f', 0, 64),
			Content:  results.Document[0][i],
			MetaData: results.Metadata[0][i],
		}
		similarityScore := 1.0
		if base != 0 {
			// similarityScore = 1.0 - (results.Distance[0][i]-minDistance)/base
			normalized := (maxDistance - results.Distance[0][i]) / base // 0~1
			similarityScore = 0.5 + 0.5*normalized
		}
		doc.WithScore(similarityScore)
		documents = append(documents, doc)
	}

	return documents, nil
}

func (s *alayaliteSearchStore) Delete(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	startTime := time.Now()
	defer func() {
		logs.CtxInfof(ctx, "Delete operation completed in %v for %d documents",
			time.Since(startTime), len(ids))
	}()

	for _, batch := range slices.Chunks(ids, MaxDeleteBatch) {
		if err := s.manager.config.Client.DeleteById(ctx, s.collectionName, batch); err != nil {
			return fmt.Errorf("[Delete] failed to delete batch: %w", err)
		}
	}

	logs.CtxInfof(ctx, "Deleted %d documents from AlayaLite collection: %s", len(ids), s.collectionName)

	err := s.manager.config.Client.SaveCollectionRequest(ctx, s.collectionName)
	if err != nil {
		return fmt.Errorf("[Delete] failed to save collection: %w", err)
	}

	return nil
}

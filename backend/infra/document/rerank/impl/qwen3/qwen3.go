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

package qwen3

import (
	"context"
	"fmt"

	"github.com/coze-dev/coze-studio/backend/infra/document/rerank"
)

type qwen3Reranker struct {
	client *Client
}

func NewQwen3Reranker(baseURL string, token string, modelName string) rerank.Reranker {
	return &qwen3Reranker{
		NewClient(baseURL, token, modelName),
	}
}

func (q *qwen3Reranker) Rerank(ctx context.Context, req *rerank.Request) (*rerank.Response, error) {
	if req == nil || req.Data == nil || len(req.Data) == 0 {
		return nil, fmt.Errorf("invalid request: no data provided")
	}
	exists := make(map[string]bool)
	query := req.Query
	var contents []string
	var origin []*rerank.Data
	for _, resultList := range req.Data {
		for _, doc := range resultList {
			if exists[doc.Document.ID] {
				continue
			}
			exists[doc.Document.ID] = true
			contents = append(contents, doc.Document.Content)
			origin = append(origin, doc)
		}
	}
	results, usageToken, err := q.client.Rerank(query, contents, int(*req.TopN), Instruction)
	if err != nil {
		return nil, err
	}
	reordered := make([]*rerank.Data, len(results))
	for newInx, res := range results {
		reordered[newInx] = origin[res.Index]
	}

	return &rerank.Response{SortedData: reordered, TokenUsage: &usageToken}, nil
}

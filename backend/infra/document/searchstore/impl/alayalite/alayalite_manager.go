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

	"github.com/coze-dev/coze-studio/backend/infra/alayalite"
	"github.com/coze-dev/coze-studio/backend/infra/document/searchstore"
	"github.com/coze-dev/coze-studio/backend/infra/embedding"
)

type ManagerConfig struct {
	Client    *alayalite.AlayaLiteClient
	Embedding embedding.Embedder
}

func NewManager(config *ManagerConfig) (searchstore.Manager, error) {
	if config.Client == nil {
		return nil, fmt.Errorf("[NewManager] alayalite client not provided")
	}
	if config.Embedding == nil {
		return nil, fmt.Errorf("[NewManager] alayalite embedder not provided")
	}
	return &alayaliteManager{
		config: config,
	}, nil
}

type alayaliteManager struct {
	config *ManagerConfig
}

func (m *alayaliteManager) Create(ctx context.Context, req *searchstore.CreateRequest) error {
	collectionName := req.CollectionName
	collectionlist, err := m.config.Client.ListCollections(ctx)
	if err != nil {
		return fmt.Errorf("[Create] failed to get collection list: %w", err)
	}
	for _, name := range collectionlist {
		if name == collectionName {
			return nil
		}
	}
	if err := m.config.Client.CreateCollection(ctx, collectionName); err != nil {
		return fmt.Errorf("[Create] failed to create collection: %w", err)
	}
	return nil
}

func (m *alayaliteManager) Drop(ctx context.Context, req *searchstore.DropRequest) error {
	return m.config.Client.DeleteCollection(ctx, req.CollectionName, true)
}

func (m *alayaliteManager) GetType() searchstore.SearchStoreType {
	return searchstore.TypeVectorStore
}

func (m *alayaliteManager) GetSearchStore(ctx context.Context, collectionName string) (searchstore.SearchStore, error) {
	store := &alayaliteSearchStore{
		manager:        m,
		collectionName: collectionName,
	}
	return store, nil
}

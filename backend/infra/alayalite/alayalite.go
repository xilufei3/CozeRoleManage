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
)

type AlayaLiteClient struct {
	official *AlayaLiteOfficialClient
}

func NewAlayaLiteClient(baseURL string) (*AlayaLiteClient, error) {
	official, err := NewAlayaLiteOfficialClient(baseURL)
	if err != nil {
		return nil, err
	}
	return &AlayaLiteClient{official: official}, err
}

func (c *AlayaLiteClient) CreateCollection(ctx context.Context, name string) error {
	_, err := c.official.CreateCollection(ctx, CreateCollectionRequest{CollectionName: name})
	return err
}

func (c *AlayaLiteClient) DeleteCollection(ctx context.Context, name string, delete_on_disk bool) error {
	_, err := c.official.DeleteCollection(ctx, DeleteCollectionRequest{CollectionName: name, Delete_on_disk: delete_on_disk})
	return err
}

func (c *AlayaLiteClient) InsertCollection(ctx context.Context, collection string, items []InsertItem) error {
	rawItems := make([][]interface{}, len(items))
	for i, item := range items {
		vec := make([]interface{}, len(item.Vector))
		for j, v := range item.Vector {
			vec[j] = v
		}
		rawItems[i] = []interface{}{item.ID, item.Text, vec, item.Payload}
	}

	req := InsertCollectionRequest{
		CollectionName: collection,
		Items:          rawItems,
	}
	_, err := c.official.InsertCollection(ctx, req)
	return err
}

func (c *AlayaLiteClient) UpsertCollection(ctx context.Context, collection string, items []InsertItem) error {
	rawItems := make([][]interface{}, len(items))
	for i, item := range items {
		vec := make([]interface{}, len(item.Vector))
		for j, v := range item.Vector {
			vec[j] = v
		}
		rawItems[i] = []interface{}{item.ID, item.Text, vec, item.Payload}
	}
	req := UpsertCollectionRequest{
		CollectionName: collection,
		Items:          rawItems,
	}
	_, err := c.official.UpsertCollection(ctx, req)
	return err
}

func (c *AlayaLiteClient) ListCollections(ctx context.Context) ([]string, error) {
	return c.official.ListCollections(ctx)
}

func (c *AlayaLiteClient) QueryCollection(
	ctx context.Context,
	collection string,
	vectors [][]float32,
	topK int,
	efSearch int,
	numThreads int,
) (*QueryCollectionResponse, error) {
	return c.official.QueryCollection(ctx, QueryCollectionRequest{
		CollectionName: collection,
		QueryVector:    vectors,
		Limit:          topK,
		EfSearch:       efSearch,
		NumThreads:     numThreads,
	})
}

func (c *AlayaLiteClient) SaveCollectionRequest(ctx context.Context, collection string) error {
	_, err := c.official.SaveCollectionRequest(ctx, SaveCollectionRequest{CollectionName: collection})
	return err
}

func (c *AlayaLiteClient) DeleteById(ctx context.Context, collection string, ids []string) error {
	_, err := c.official.DeleteById(ctx, DeleteByIdRequest{
		CollectionName: collection,
		IDs:            ids,
	})
	return err
}

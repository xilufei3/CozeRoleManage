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

type CreateCollectionRequest struct {
	CollectionName string `json:"collection_name"`
}

type DeleteCollectionRequest struct {
	CollectionName string `json:"collection_name"`
	Delete_on_disk bool   `json:"delete_on_disk"`
}

type InsertItem struct {
	ID      string
	Text    string
	Vector  []float32
	Payload map[string]interface{}
}

type InsertCollectionRequest struct {
	CollectionName string          `json:"collection_name"`
	Items          [][]interface{} `json:"items"`
}

type UpsertCollectionRequest struct {
	CollectionName string          `json:"collection_name"`
	Items          [][]interface{} `json:"items"`
}

type QueryCollectionRequest struct {
	CollectionName string      `json:"collection_name"`
	QueryVector    [][]float32 `json:"query_vector"`
	Limit          int         `json:"limit"`
	EfSearch       int         `json:"ef_search,omitempty"`
	NumThreads     int         `json:"num_threads,omitempty"`
}

type DeleteByIdRequest struct {
	CollectionName string   `json:"collection_name"`
	IDs            []string `json:"ids"`
}

type SaveCollectionRequest struct {
	CollectionName string `json:"collection_name"`
}

type QueryCollectionResponse struct {
	ID       [][]float64                `json:"id"`
	Document [][]string                 `json:"document"`
	Metadata [][]map[string]interface{} `json:"metadata"`
	Distance [][]float64                `json:"distance"`
}

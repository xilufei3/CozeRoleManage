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
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type AlayaLiteOfficialClient struct {
	baseURL string
	http    *http.Client
}

func NewAlayaLiteOfficialClient(baseURL string) (*AlayaLiteOfficialClient, error) {
	return &AlayaLiteOfficialClient{
		baseURL: baseURL,
		http:    &http.Client{},
	}, nil
}

func (c *AlayaLiteOfficialClient) CreateCollection(ctx context.Context, req CreateCollectionRequest) (string, error) {
	var resp string
	err := doJSON(ctx, c.http, http.MethodPost, c.baseURL+"/api/v1/collection/create", req, &resp)
	return resp, err
}

func (c *AlayaLiteOfficialClient) DeleteCollection(ctx context.Context, req DeleteCollectionRequest) (string, error) {
	var resp string
	err := doJSON(ctx, c.http, http.MethodPost, c.baseURL+"/api/v1/collection/delete", req, &resp)
	return resp, err
}

func (c *AlayaLiteOfficialClient) InsertCollection(ctx context.Context, req InsertCollectionRequest) (string, error) {
	var resp string
	err := doJSON(ctx, c.http, http.MethodPost, c.baseURL+"/api/v1/collection/insert", req, &resp)
	return resp, err
}

func (c *AlayaLiteOfficialClient) UpsertCollection(ctx context.Context, req UpsertCollectionRequest) (string, error) {
	var resp string
	err := doJSON(ctx, c.http, http.MethodPost, c.baseURL+"/api/v1/collection/upsert", req, &resp)
	return resp, err
}

func (c *AlayaLiteOfficialClient) ListCollections(ctx context.Context) ([]string, error) {
	var resp []string
	err := doJSON(ctx, c.http, http.MethodPost, c.baseURL+"/api/v1/collection/list", nil, &resp)
	return resp, err
}

func (c *AlayaLiteOfficialClient) QueryCollection(ctx context.Context, req QueryCollectionRequest) (*QueryCollectionResponse, error) {
	var resp QueryCollectionResponse
	err := doJSON(ctx, c.http, http.MethodPost, c.baseURL+"/api/v1/collection/query", req, &resp)
	return &resp, err
}

func (c *AlayaLiteOfficialClient) DeleteById(ctx context.Context, req DeleteByIdRequest) (string, error) {
	var resp string
	err := doJSON(ctx, c.http, http.MethodPost, c.baseURL+"/api/v1/collection/delete_by_id", req, &resp)
	return resp, err
}

func (c *AlayaLiteOfficialClient) SaveCollectionRequest(ctx context.Context, req SaveCollectionRequest) (string, error) {
	var resp string
	err := doJSON(ctx, c.http, http.MethodPost, c.baseURL+"/api/v1/collection/save", req, &resp)
	return resp, err
}

func doJSON(ctx context.Context, httpClient *http.Client, method, url string, reqBody interface{}, respBody interface{}) error {
	var bodyReader io.Reader
	if reqBody != nil {
		data, err := json.Marshal(reqBody)
		if err != nil {
			return fmt.Errorf("marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	if reqBody != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("http error: %s, body=%s", resp.Status, string(data))
	}
	if respBody != nil {
		if err := json.Unmarshal(data, respBody); err != nil {
			return fmt.Errorf("decode response: %w, body=%s", err, string(data))
		}
	}
	return nil
}

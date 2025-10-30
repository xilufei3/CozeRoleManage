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
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type RerankInput struct {
	Query     string   `json:"query"`
	Documents []string `json:"documents"`
}

type RerankResult struct {
	Document struct {
		Text string `json:"text"`
	} `json:"document"`
	Index          int     `json:"index"`
	RelevanceScore float64 `json:"relevance_score"`
}

type RerankResponse struct {
	Output struct {
		Results []RerankResult `json:"results"`
	} `json:"output"`
	Usage struct {
		TotalTokens int64 `json:"total_tokens"`
	} `json:"usage"`
	RequestID string `json:"request_id"`
	Code      string `json:"code,omitempty"`
	Message   string `json:"message,omitempty"`
}

type Client struct {
	BaseURL string
	Token   string
	Model   string
}

func NewClient(baseURL string, token string, model string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		Model:   model,
	}
}

func (c *Client) Rerank(query string, documents []string, topN int, instruct string) ([]RerankResult, int64, error) {
	reqBody := map[string]interface{}{
		"model": c.Model,
		"input": map[string]interface{}{
			"query":     query,
			"documents": documents,
		},
		"parameters": map[string]interface{}{
			"return_documents": true,
			"top_n":            topN,
			"instruct":         instruct,
		},
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, 0, err
	}

	req, err := http.NewRequest("POST", c.BaseURL, bytes.NewBuffer(data))
	if err != nil {
		return nil, 0, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.Token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var res RerankResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return nil, 0, err
	}

	if res.Code != "" {
		return nil, 0, fmt.Errorf("%s: %s", res.Code, res.Message)
	}

	return res.Output.Results, res.Usage.TotalTokens, nil
}

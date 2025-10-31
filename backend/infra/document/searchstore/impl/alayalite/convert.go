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
	"strings"

	"github.com/cloudwego/eino/schema"
)

func ExtractContent(doc *schema.Document) string {
	if doc.Content != "" {
		return strings.TrimSpace(doc.Content)
	}
	if doc.MetaData != nil {
		if content, ok := doc.MetaData["content"].(string); ok && content != "" {
			return strings.TrimSpace(content)
		}
		if text, ok := doc.MetaData["text"].(string); ok && text != "" {
			return strings.TrimSpace(text)
		}
	}
	return ""
}

func BuildMetadata(doc *schema.Document) map[string]interface{} {
	metadata := make(map[string]interface{})
	if doc.MetaData != nil {
		for k, v := range doc.MetaData {
			metadata[k] = v
		}
	}
	metadata["document_id"] = doc.ID
	metadata["content_length"] = len(doc.Content)

	return metadata
}

// func MetadataToJSON(metadata map[string]interface{}) (string, error) {
// 	if metadata == nil {
// 		return "{}", nil
// 	}
// 	jsonBytes, err := json.Marshal(metadata)
// 	if err != nil {
// 		return "", fmt.Errorf("failed to marshal metadata: %w", err)
// 	}
// 	return string(jsonBytes), nil
// }

func ConvertToFloat32(f64 []float64) []float32 {
	f32 := make([]float32, len(f64))
	for i, v := range f64 {
		f32[i] = float32(v)
	}
	return f32
}

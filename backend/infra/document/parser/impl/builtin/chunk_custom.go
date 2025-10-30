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

package builtin

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "regexp"
    "strconv"
    "strings"
    "time"

	"github.com/coze-dev/coze-studio/backend/pkg/logs"
	"github.com/cloudwego/eino/components/document/parser"
	"github.com/cloudwego/eino/schema"
	"github.com/tmc/langchaingo/textsplitter"

	contract "github.com/coze-dev/coze-studio/backend/infra/document/parser"
)

var (
	spaceRegex = regexp.MustCompile(`\s+`)
	urlRegex   = regexp.MustCompile(`https?://\S+|www\.\S+`)
	emailRegex = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
)

func ChunkCustom(ctx context.Context, text string, config *contract.Config, opts ...parser.Option) (docs []*schema.Document, err error) {
	cs := config.ChunkingStrategy
	logs.CtxDebugf(ctx, "[ChunkCustom DEBUG] Starting with split_mode=%q, langchain_type=%q, chunk_size=%d, overlap=%d, text_length=%d",
		cs.SplitMode, cs.LangchainType, cs.ChunkSize, cs.Overlap, len(text))

	if cs.Overlap >= cs.ChunkSize {
		logs.CtxErrorf(ctx, "[ChunkCustom DEBUG] Invalid param: overlap(%d) >= chunk_size(%d)", cs.Overlap, cs.ChunkSize)
		return nil, fmt.Errorf("[ChunkCustom] invalid param, overlap >= chunk_size")
	}

	var (
		parts         []string
		buffer        []rune
		currentLength int64
		options       = parser.GetCommonOptions(&parser.Options{ExtraMeta: map[string]any{}}, opts...)
	)

	// 根据分割模式选择不同的分割方法
	switch cs.SplitMode {
	case "regex":
		if cs.RegexPattern == "" {
			return nil, fmt.Errorf("[ChunkCustom] regex pattern is required for regex mode")
		}
		logs.CtxDebugf(ctx, "[REGEX DEBUG] 1. Original pattern from message queue: %q", cs.RegexPattern)
		regexCompiled, err := regexp.Compile(cs.RegexPattern)
		if err != nil {
			logs.CtxErrorf(ctx, "[REGEX DEBUG] 2. regexp.Compile FAILED: %v", err)
			return nil, fmt.Errorf("[ChunkCustom] invalid regex pattern: %v", err)
		}
		logs.CtxDebugf(ctx, "[REGEX DEBUG] 3. Regex compiled successfully. Starting split...")
		parts = regexCompiled.Split(text, -1)

	case "langchain":
		if cs.LangchainType == "" {
			return nil, fmt.Errorf("[ChunkCustom] langchain type is required for langchain mode")
		}
		// 使用 langchaingo 提供的 splitter
		langchainType := strings.ToLower(cs.LangchainType)
		logs.CtxDebugf(ctx, "[LANGCHAIN DEBUG] Processing langchain_type: %q (normalized: %q)", cs.LangchainType, langchainType)
		switch langchainType {
		case "recursivecharactertextsplitter", "recursive":
			logs.CtxDebugf(ctx, "[LANGCHAIN DEBUG] Using RecursiveCharacter splitter with chunk_size=%d, overlap=%d", cs.ChunkSize, cs.Overlap)
			splitter := textsplitter.NewRecursiveCharacter(
				textsplitter.WithChunkSize(int(cs.ChunkSize)),
				textsplitter.WithChunkOverlap(int(cs.Overlap)),
			)
			chunks, splitErr := splitter.SplitText(text)
			if splitErr != nil {
				logs.CtxErrorf(ctx, "[LANGCHAIN DEBUG] RecursiveCharacter SplitText failed: %v", splitErr)
				return nil, fmt.Errorf("[ChunkCustom] RecursiveCharacter split failed: %v", splitErr)
			}
			logs.CtxDebugf(ctx, "[LANGCHAIN DEBUG] RecursiveCharacter split success, got %d chunks", len(chunks))
			parts = chunks
		case "markdowntextsplitter", "markdown":
			logs.CtxDebugf(ctx, "[LANGCHAIN DEBUG] Using MarkdownTextSplitter with chunk_size=%d, overlap=%d", cs.ChunkSize, cs.Overlap)
			splitter := textsplitter.NewMarkdownTextSplitter(
				textsplitter.WithChunkSize(int(cs.ChunkSize)),
				textsplitter.WithChunkOverlap(int(cs.Overlap)),
				textsplitter.WithCodeBlocks(true),
				textsplitter.WithReferenceLinks(true),
				textsplitter.WithHeadingHierarchy(true),
				textsplitter.WithJoinTableRows(true),
			)
			chunks, splitErr := splitter.SplitText(text)
			if splitErr != nil {
				logs.CtxErrorf(ctx, "[LANGCHAIN DEBUG] MarkdownTextSplitter SplitText failed: %v", splitErr)
				return nil, fmt.Errorf("[ChunkCustom] MarkdownTextSplitter split failed: %v", splitErr)
			}
			logs.CtxDebugf(ctx, "[LANGCHAIN DEBUG] MarkdownTextSplitter split success, got %d chunks", len(chunks))
			parts = chunks
		default:
			logs.CtxErrorf(ctx, "[LANGCHAIN DEBUG] Unsupported langchain_type: %q", cs.LangchainType)
			return nil, fmt.Errorf("[ChunkCustom] unsupported langchain type: %s. Supported types: recursive, markdown", cs.LangchainType)
		}

	case "lmchunker":
		// 准备 HTTP 请求数据
		requestData := map[string]any{
			"text":   text,
			"method": "ppl", // 默认使用 ppl 方法
			"language": "zh", // 默认中文
			"target_size": cs.ChunkSize,
		}

		// 从ChunkingStrategy获取LMChunker方法参数
		if cs.LMChunkerMethod != nil {
			switch *cs.LMChunkerMethod {
			case 0:
				requestData["method"] = "ppl"
			case 1:
				requestData["method"] = "ms"
			case 2:
				requestData["method"] = "lumber_ms"
			default:
				logs.CtxWarnf(ctx, "[LMCHUNKER DEBUG] Unknown LMChunkerMethod: %d, using default 'ppl'", *cs.LMChunkerMethod)
				requestData["method"] = "ppl"
			}
		}

		// 从环境变量获取其他可选配置
		if lang := os.Getenv("LMCHUNKER_LANGUAGE"); lang != "" {
			requestData["language"] = lang
		}
		if threshold := os.Getenv("LMCHUNKER_THRESHOLD"); threshold != "" {
			if th, err := strconv.ParseFloat(threshold, 64); err == nil {
				requestData["threshold"] = th
			}
		}

		// 序列化请求数据
		requestJSON, err := json.Marshal(requestData)
		if err != nil {
			return nil, fmt.Errorf("[ChunkCustom] lmchunker: marshal request failed: %w", err)
		}

		// 从环境变量获取 LMChunker 服务地址
		lmchunkerURL := os.Getenv("LMCHUNKER_SERVICE_URL")
		if lmchunkerURL == "" {
			lmchunkerURL = "http://localhost:8000" // 默认值，用于本地开发
		}

		logs.CtxDebugf(ctx, "[LMCHUNKER DEBUG] Sending HTTP request to %s", lmchunkerURL)
		logs.CtxDebugf(ctx, "[LMCHUNKER DEBUG] Request JSON: %s", string(requestJSON))

		// 实现重试机制来处理间歇性错误
		maxRetries := 3
		var lastErr error
		
		for attempt := 1; attempt <= maxRetries; attempt++ {
			logs.CtxDebugf(ctx, "[LMCHUNKER DEBUG] Attempt %d/%d", attempt, maxRetries)
			
			// 发送 HTTP 请求到 LMChunker 服务
			client := &http.Client{
				Timeout: 5 * time.Minute, // 5分钟超时，支持长文本处理
			}

			req, err := http.NewRequestWithContext(ctx, "POST", lmchunkerURL+"/api/v1/chunk", bytes.NewReader(requestJSON))
			if err != nil {
				lastErr = fmt.Errorf("[ChunkCustom] lmchunker: create request failed: %w", err)
				continue
			}
			req.Header.Set("Content-Type", "application/json")

			resp, err := client.Do(req)
			if err != nil {
				if ctx.Err() == context.Canceled || ctx.Err() == context.DeadlineExceeded {
					logs.CtxWarnf(ctx, "[LMCHUNKER DEBUG] HTTP request canceled: %v", err)
					return nil, fmt.Errorf("[ChunkCustom] lmchunker: request canceled: %w", ctx.Err())
				}
				logs.CtxWarnf(ctx, "[LMCHUNKER DEBUG] HTTP request failed (attempt %d): %v", attempt, err)
				lastErr = err
				if attempt < maxRetries {
					time.Sleep(time.Duration(attempt) * time.Second) // 递增延迟
					continue
				}
				return nil, fmt.Errorf("[ChunkCustom] lmchunker: HTTP request failed after %d attempts: %w", maxRetries, err)
			}
			defer resp.Body.Close()

			// 读取响应
			responseBody, err := io.ReadAll(resp.Body)
			if err != nil {
				lastErr = fmt.Errorf("[ChunkCustom] lmchunker: read response failed: %w", err)
				continue
			}

			logs.CtxDebugf(ctx, "[LMCHUNKER DEBUG] HTTP response status: %d", resp.StatusCode)
			logs.CtxDebugf(ctx, "[LMCHUNKER DEBUG] HTTP response body: %s", string(responseBody))

			// 检查 HTTP 状态码
			if resp.StatusCode != http.StatusOK {
				errorMsg := fmt.Sprintf("[ChunkCustom] lmchunker: HTTP request failed with status %d: %s", resp.StatusCode, string(responseBody))
				
				// 检查是否是 get_seq_length 错误
				if strings.Contains(string(responseBody), "get_seq_length") {
					logs.CtxWarnf(ctx, "[LMCHUNKER DEBUG] Detected get_seq_length error (attempt %d), retrying...", attempt)
					lastErr = fmt.Errorf("%s", errorMsg)
					if attempt < maxRetries {
						time.Sleep(time.Duration(attempt) * time.Second) // 递增延迟
						continue
					}
				}
				
				return nil, fmt.Errorf("%s", errorMsg)
			}

			// 解析响应
			type lmchunkerResponse struct {
				Chunks   []string `json:"chunks"`
				Count    int      `json:"count"`
				Method   string   `json:"method"`
				Language string   `json:"language"`
				Error    string   `json:"error,omitempty"`
			}

			result := &lmchunkerResponse{}
			if err = json.Unmarshal(responseBody, result); err != nil {
				logs.CtxErrorf(ctx, "[LMCHUNKER DEBUG] decode response failed: %v, body: %s", err, string(responseBody))
				lastErr = fmt.Errorf("[ChunkCustom] lmchunker: decode response failed: %w", err)
				continue
			}

			if result.Error != "" {
				errorMsg := fmt.Sprintf("[ChunkCustom] lmchunker: service error: %s", result.Error)
				
				// 检查是否是 get_seq_length 错误
				if strings.Contains(result.Error, "get_seq_length") {
					logs.CtxWarnf(ctx, "[LMCHUNKER DEBUG] Detected get_seq_length service error (attempt %d), retrying...", attempt)
					lastErr = fmt.Errorf("%s", errorMsg)
					if attempt < maxRetries {
						time.Sleep(time.Duration(attempt) * time.Second) // 递增延迟
						continue
					}
				}
				
				return nil, fmt.Errorf("%s", errorMsg)
			}

			// 成功处理，转换为文档格式
			for _, chunk := range result.Chunks {
				doc := &schema.Document{Content: chunk, MetaData: map[string]any{}}
				for k, v := range options.ExtraMeta {
					doc.MetaData[k] = v
				}
				docs = append(docs, doc)
			}

			logs.CtxDebugf(ctx, "[LMCHUNKER DEBUG] Successfully processed %d chunks using method %s (attempt %d)", len(result.Chunks), result.Method, attempt)
			return docs, nil
		}
		
		// 如果所有重试都失败了
		return nil, fmt.Errorf("[ChunkCustom] lmchunker: failed after %d attempts, last error: %w", maxRetries, lastErr)

	default: // "simple" or empty (backward compatibility)
		parts = strings.Split(text, cs.Separator)
	}

	trim := func(text string) string {
		if cs.TrimURLAndEmail {
			text = urlRegex.ReplaceAllString(text, "")
			text = emailRegex.ReplaceAllString(text, "")
		}

		if cs.TrimSpace {
			text = strings.TrimSpace(text)
			text = spaceRegex.ReplaceAllString(text, " ")
		}

		return text
	}

	add := func() {
		if len(buffer) == 0 {
			return
		}
		doc := &schema.Document{
			Content:  string(buffer),
			MetaData: map[string]any{},
		}
		for k, v := range options.ExtraMeta {
			doc.MetaData[k] = v
		}
		docs = append(docs, doc)
		buffer = []rune{}
	}

	processPart := func(part string) {
		runes := []rune(part)
		for partLength := int64(len(runes)); partLength > 0; partLength = int64(len(runes)) {
			pos := min(partLength, cs.ChunkSize-currentLength)
			buffer = append(buffer, runes[:pos]...)
			currentLength = int64(len(buffer))

			if currentLength >= cs.ChunkSize {
				add()
				if cs.Overlap > 0 {
					buffer = getOverlap([]rune(docs[len(docs)-1].Content), cs.Overlap, cs.ChunkSize)
					currentLength = int64(len(buffer))
				} else {
					currentLength = 0
				}
			}
			runes = runes[pos:]
		}

		add()
	}

	for _, part := range parts {
		processPart(trim(part))
	}

	add()

	return docs, nil
}

func min(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}

func getOverlap(runes []rune, overlapRatio int64, chunkSize int64) []rune {
	overlap := int64(float64(chunkSize) * float64(overlapRatio) / 100)
	if int64(len(runes)) <= overlap {
		return runes
	}
	return runes[len(runes)-int(overlap):]
}

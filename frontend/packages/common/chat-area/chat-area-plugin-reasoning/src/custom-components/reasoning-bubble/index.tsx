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

import { type FC } from 'react';

import './style.css';

export interface ReasoningBubbleProps {
  text: string;
  showIndicator?: boolean;
}

export const ReasoningBubble: FC<ReasoningBubbleProps> = ({
  text,
  showIndicator = false,
}) => {
  // 根据文本内容选择图标
  const icon = text.includes('思考') ? '🤔' : '✍️';

  return (
    <div className="reasoning-bubble">
      <div className="reasoning-bubble-content">
        <span className="reasoning-bubble-icon">{icon}</span>
        <span className="reasoning-bubble-text">{text}</span>
        {showIndicator ? (
          <span className="reasoning-bubble-indicator">
            <span className="reasoning-bubble-dot"></span>
            <span className="reasoning-bubble-dot"></span>
            <span className="reasoning-bubble-dot"></span>
          </span>
        ) : null}
      </div>
    </div>
  );
};

ReasoningBubble.displayName = 'ReasoningBubble';

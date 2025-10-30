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

import classNames from 'classnames';
import { KnowledgeE2e } from '@coze-data/e2e';
import { I18n } from '@coze-arch/i18n';
import {
  Checkbox,
  Select,
  CozInputNumber,
  Form,
  Input,
  CheckboxGroup,
  Radio,
} from '@coze-arch/coze-design';

import {
  PreProcessRule,
  SeperatorType,
  type CustomSegmentRule,
  type Seperator,
  SegmentMode,
  SplitMode,
  LangchainSplitterType,
  LMChunkerMethod,
} from '@/types';
import { getSeperatorOptionList } from '@/constants';

const SEGMENT_MIN = 100;
const SEGMENT_MAX = 5000;
const OVERLAP_MAX = 90;
const OVERLAP_MIN = 0;

interface CustomSegmentProps {
  segmentMode: SegmentMode;
  segmentRule: CustomSegmentRule;
  onChange: (params: {
    segmentMode?: SegmentMode;
    segmentRule?: CustomSegmentRule;
  }) => void;
}

function getMaxTokens(maxTokens: number): number {
  if (maxTokens < SEGMENT_MIN) {
    return SEGMENT_MIN;
  }
  if (maxTokens > SEGMENT_MAX) {
    return SEGMENT_MAX;
  }
  return maxTokens;
}

// 分割模式选择器组件
const SplitModeSelector = ({
  splitMode,
  onModeChange,
}: {
  splitMode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
}) => (
  <div>
    <Form.Label required>分割模式</Form.Label>
    <Radio.Group
      type="button"
      value={splitMode}
      onChange={event => onModeChange(event.target.value as SplitMode)}
      className="flex flex-row gap-2"
    >
      <Radio value={SplitMode.SIMPLE}>简单分隔符</Radio>
      <Radio value={SplitMode.REGEX}>正则表达式</Radio>
      <Radio value={SplitMode.LANGCHAIN}>智能分割</Radio>
      <Radio value={SplitMode.LMCHUNKER}>LM分块器</Radio>
    </Radio.Group>
  </div>
);

// 简单分隔符配置组件
const SimpleSeparatorConfig = ({
  separator,
  onChange,
}: {
  separator: Seperator;
  onChange: (separator: Seperator) => void;
}) => (
  <div data-testid={KnowledgeE2e.ResegmentCustomIdentifierSelect}>
    <Form.Label required>{I18n.t('datasets_Custom_segmentID')}</Form.Label>
    <Select
      placeholder={I18n.t('datasets_custom_segmentID_placeholder')}
      optionList={getSeperatorOptionList()}
      className="w-full"
      value={separator.type}
      onChange={(
        newType:
          | string
          | number
          | unknown[]
          | Record<string, unknown>
          | undefined,
      ) => onChange({ type: newType as SeperatorType, customValue: '' })}
    />
    {separator.type === SeperatorType.CUSTOM && (
      <Input
        className="w-full mt-[4px]"
        value={separator.customValue || ''}
        onChange={(v: string) => onChange({ ...separator, customValue: v })}
        placeholder={I18n.t('datasets_custom_segmentID_placeholder')}
      />
    )}
  </div>
);

// 正则表达式配置组件
const RegexConfig = ({
  regexPattern,
  onChange,
}: {
  regexPattern: string | undefined;
  onChange: (pattern: string) => void;
}) => (
  <div>
    <Form.Label required>正则表达式</Form.Label>
    <Input
      className="w-full"
      value={regexPattern || ''}
      onChange={onChange}
      placeholder="请输入合法的正则表达式"
    />
  </div>
);

// LangChain配置组件
const LangChainConfig = ({
  langchainSplitter,
  onChange,
}: {
  langchainSplitter: LangchainSplitterType | undefined;
  onChange: (splitter: LangchainSplitterType) => void;
}) => (
  <div>
    <Form.Label required>LangChain 分割器</Form.Label>
    <Select
      className="w-full"
      value={langchainSplitter}
      onChange={(
        v: string | number | unknown[] | Record<string, unknown> | undefined,
      ) => onChange(v as LangchainSplitterType)}
      optionList={[
        { value: LangchainSplitterType.RECURSIVE, label: '递归分割' },
        {
          value: LangchainSplitterType.MARKDOWN,
          label: 'Markdown 分割 (推荐)',
        },
      ]}
    />
    <div className="p-2 mt-2 bg-gray-100 rounded text-sm text-gray-600">
      {langchainSplitter === LangchainSplitterType.RECURSIVE
        ? '适用于通用文本。此模式将自动使用一系列分隔符（如段落、句子等）进行智能切分，优先保留文本的语义结构。'
        : '专为 Markdown 格式设计。此模式将优先根据标题、代码块、列表等元素进行分割，以保持文档的结构完整性。'}
    </div>
  </div>
);

// LMChunker配置组件
const LMChunkerConfig = ({
  lmchunkerMethod,
  onChange,
}: {
  lmchunkerMethod: LMChunkerMethod | undefined;
  onChange: (method: LMChunkerMethod) => void;
}) => (
  <div>
    <Form.Label required>LM分块器方法</Form.Label>
    <Select
      className="w-full"
      value={lmchunkerMethod}
      onChange={(
        v: string | number | unknown[] | Record<string, unknown> | undefined,
      ) => onChange(v as LMChunkerMethod)}
      optionList={[
        { value: LMChunkerMethod.PPL, label: 'PPL (困惑度分块)' },
        { value: LMChunkerMethod.MS, label: 'MS (边际采样)' },
        { value: LMChunkerMethod.LUMBER_MS, label: 'Lumber MS (语义感知分块)' },
      ]}
    />
    <div className="p-2 mt-2 bg-gray-100 rounded text-sm text-gray-600">
      {lmchunkerMethod === LMChunkerMethod.PPL
        ? '基于困惑度的分块方法，利用语言模型的困惑度评估文本中语义不连贯的区域，在困惑度最低处进行分割，适用于保持语义连贯性。'
        : lmchunkerMethod === LMChunkerMethod.MS
          ? '边际采样方法，计算模型预测概率的差距来判断语义不确定区域，当预测候选概率差距较小时避免切割，确保语义完整性。'
          : 'Lumber增强方法，结合语义感知的动态分块与边际采样技术，利用本地小模型进行高效判断，在保持语义完整性的同时提高分割效率。'}
    </div>
  </div>
);

// 通用设置组件
const CommonSettings = ({
  maxTokens,
  overlap,
  preProcessRules,
  onChange,
}: {
  maxTokens: number;
  overlap: number;
  preProcessRules: PreProcessRule[];
  onChange: (updates: Partial<CustomSegmentRule>) => void;
}) => (
  <div className="border-t pt-4 mt-2 flex flex-col gap-[12px]">
    <div data-testid={KnowledgeE2e.ResegmentCustomMaxLenInput}>
      <Form.Label required>最大分段长度</Form.Label>
      <CozInputNumber
        value={maxTokens}
        onChange={v => onChange({ maxTokens: getMaxTokens(Number(v)) })}
        className="w-full"
        min={SEGMENT_MIN}
        max={SEGMENT_MAX}
      />
    </div>
    <div>
      <Form.Label required>分段重叠度(%)</Form.Label>
      <CozInputNumber
        value={overlap}
        onChange={v => onChange({ overlap: Number(v) })}
        className="w-full"
        max={OVERLAP_MAX}
        min={OVERLAP_MIN}
      />
    </div>
    <div data-testid={KnowledgeE2e.ResegmentCustomRuleText}>
      <Form.Label>{I18n.t('datasets_Custom_rule')}</Form.Label>
      <CheckboxGroup
        value={preProcessRules}
        onChange={(v: PreProcessRule[]) => onChange({ preProcessRules: v })}
        className="w-full gap-[4px]"
        aria-label={I18n.t('datasets_Custom_rule')}
      >
        <Checkbox value={PreProcessRule.REMOVE_SPACES}>
          {I18n.t('datasets_Custom_rule_replace')}
        </Checkbox>
        <Checkbox value={PreProcessRule.REMOVE_EMAILS}>
          {I18n.t('datasets_Custom_rule_delete')}
        </Checkbox>
      </CheckboxGroup>
    </div>
  </div>
);

const CustomSegmentContent = ({
  segmentRule,
  onChange,
}: {
  segmentRule: CustomSegmentRule;
  onChange: (segmentRule: CustomSegmentRule) => void;
}) => {
  const {
    splitMode,
    separator,
    regexPattern,
    langchainSplitter,
    lmchunkerMethod,
    maxTokens,
    preProcessRules,
    overlap,
  } = segmentRule;

  const handleModeChange = (newMode: SplitMode) => {
    const newRule: CustomSegmentRule = {
      maxTokens: segmentRule.maxTokens,
      overlap: segmentRule.overlap,
      preProcessRules: segmentRule.preProcessRules,
      splitMode: newMode,
      separator: { type: SeperatorType.LINE_BREAK, customValue: '' },
      regexPattern: '',
      langchainSplitter: LangchainSplitterType.RECURSIVE,
      lmchunkerMethod: LMChunkerMethod.PPL,
    };
    onChange(newRule);
  };

  const handlePartialChange = (updates: Partial<CustomSegmentRule>) => {
    onChange({ ...segmentRule, ...updates });
  };

  return (
    <div className="flex flex-col gap-[12px] mt-12px">
      <SplitModeSelector
        splitMode={splitMode}
        onModeChange={handleModeChange}
      />

      {splitMode === SplitMode.SIMPLE && (
        <SimpleSeparatorConfig
          separator={separator}
          onChange={newSeparator =>
            handlePartialChange({ separator: newSeparator })
          }
        />
      )}

      {splitMode === SplitMode.REGEX && (
        <RegexConfig
          regexPattern={regexPattern}
          onChange={pattern => handlePartialChange({ regexPattern: pattern })}
        />
      )}

      {splitMode === SplitMode.LANGCHAIN && (
        <LangChainConfig
          langchainSplitter={langchainSplitter}
          onChange={splitter =>
            handlePartialChange({ langchainSplitter: splitter })
          }
        />
      )}

      {splitMode === SplitMode.LMCHUNKER && (
        <LMChunkerConfig
          lmchunkerMethod={lmchunkerMethod}
          onChange={method => handlePartialChange({ lmchunkerMethod: method })}
        />
      )}

      <CommonSettings
        maxTokens={maxTokens}
        overlap={overlap}
        preProcessRules={preProcessRules}
        onChange={handlePartialChange}
      />
    </div>
  );
};

export const CustomSegment = ({
  segmentMode,
  segmentRule,
  onChange,
}: CustomSegmentProps) => (
  <Radio
    data-testid={KnowledgeE2e.CreateUnitResegmentCustomRadio}
    className={classNames(
      segmentMode === SegmentMode.CUSTOM ? 'custom-wrapper' : '',
    )}
    value={SegmentMode.CUSTOM}
    extra={
      <>
        {I18n.t('datasets_createFileModel_step3_customDescription')}
        {segmentMode === SegmentMode.CUSTOM && (
          <CustomSegmentContent
            segmentRule={segmentRule}
            onChange={newSegmentRule => {
              onChange({ segmentRule: newSegmentRule });
            }}
          />
        )}
      </>
    }
  >
    {I18n.t('datasets_createFileModel_step3_custom')}
  </Radio>
);

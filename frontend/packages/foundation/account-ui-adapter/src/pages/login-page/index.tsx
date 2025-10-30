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

import { type FC, useState } from 'react';

import { CozeBrand } from '@coze-studio/components/coze-brand';
import { I18n } from '@coze-arch/i18n';
import { Button, Form } from '@coze-arch/coze-design';
import { SignFrame, SignPanel } from '@coze-arch/bot-semi';

import { useLoginService } from './service';
import { Favicon, Slogan } from './favicon';

export const LoginPage: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasError, setHasError] = useState(false);

  const { login, register, loginLoading, registerLoading } = useLoginService({
    email,
    password,
  });

  const submitDisabled = !email || !password || hasError;

  return (
    <SignFrame brandNode={<CozeBrand isOversea={IS_OVERSEA} />}>
      <div className="flex items-center justify-center w-full h-full">
        {/* ���ͼƬչʾ���� */}
        <div className="flex-1 flex items-center justify-center">
          <Slogan />
        </div>

        {/* �Ҳ��¼��� */}
        <div className="flex-1 flex items-center justify-center">
          <SignPanel className="w-[390px] h-[500px] pt-[50px]">
            <div className="flex flex-col items-center w-full h-full">
              <Favicon />
              <div className="text-[22px] font-medium coze-fg-plug leading-[32px] mt-[28px]">
                {I18n.t('open_source_login_welcome')}
              </div>
              <div className="mt-[55px] w-[250px] flex flex-col items-stretch [&_.semi-input-wrapper]:overflow-hidden">
                <Form
                  onErrorChange={errors => {
                    setHasError(Object.keys(errors).length > 0);
                  }}
                >
                  <Form.Input
                    data-testid="login.input.email"
                    noLabel
                    type="email"
                    field="email"
                    rules={[
                      {
                        required: true,
                        message: I18n.t('open_source_login_placeholder_email'),
                      },
                      {
                        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: I18n.t('open_source_login_placeholder_email'),
                      },
                    ]}
                    onChange={newVal => {
                      setEmail(newVal);
                    }}
                    placeholder={I18n.t('open_source_login_placeholder_email')}
                  />
                  <Form.Input
                    data-testid="login.input.password"
                    noLabel
                    rules={[
                      {
                        required: true,
                        message: I18n.t(
                          'open_source_login_placeholder_password',
                        ),
                      },
                    ]}
                    field="password"
                    type="password"
                    onChange={setPassword}
                    placeholder={I18n.t(
                      'open_source_login_placeholder_password',
                    )}
                  />
                </Form>
                <Button
                  data-testid="login.button.login"
                  className="mt-[10px]"
                  disabled={submitDisabled || registerLoading}
                  onClick={login}
                  loading={loginLoading}
                  color="hgltplus"
                >
                  {I18n.t('login_button_text')}
                </Button>
                <Button
                  data-testid="login.button.signup"
                  className="mt-[18px]"
                  disabled={submitDisabled || loginLoading}
                  onClick={register}
                  loading={registerLoading}
                  color="primary"
                >
                  {I18n.t('register')}
                </Button>
              </div>
            </div>
          </SignPanel>
        </div>
      </div>
    </SignFrame>
  );
};

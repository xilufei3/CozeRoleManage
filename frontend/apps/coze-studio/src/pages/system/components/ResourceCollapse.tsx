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

import { forwardRef, useMemo, useRef, useState } from 'react';

import cls from 'classnames';
import { useHover } from 'ahooks';
import { IconCozArrowDownFill } from '@coze-arch/coze-design/icons';
import { Collapsible } from '@coze-arch/coze-design';

import styles from './ResourceCollapse.module.less';

interface ResourceCollapseProps {
  title: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
}

export const ResourceCollapse = forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<ResourceCollapseProps>
>(
  (
    {
      title,
      extra,
      className,
      headerClassName,
      contentClassName,
      defaultOpen = false,
      children,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const headerRef = useRef<HTMLDivElement>(null);
    const isHover = useHover(() => headerRef.current);

    const iconClassName = useMemo(
      () =>
        cls(styles.icon, {
          [styles.closed]: !isOpen,
          [styles.hover]: isHover,
        }),
      [isOpen, isHover],
    );

    return (
      <div ref={ref} className={cls(styles.container, className)}>
        <div
          ref={headerRef}
          className={cls(styles.header, headerClassName)}
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(open => !open)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsOpen(open => !open);
            }
          }}
        >
          <IconCozArrowDownFill className={iconClassName} />
          <span className={styles.title}>{title}</span>
          {extra ? (
            <div
              className={styles.extra}
              onClick={event => {
                event.stopPropagation();
              }}
            >
              {extra}
            </div>
          ) : null}
        </div>
        <Collapsible
          className={cls(styles.content, contentClassName)}
          isOpen={isOpen}
          keepDOM
          fade
          duration={200}
        >
          {children}
        </Collapsible>
      </div>
    );
  },
);

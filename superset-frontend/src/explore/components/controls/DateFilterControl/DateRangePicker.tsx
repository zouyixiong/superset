/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { RangePicker } from '@superset-ui/core/components/DatePicker';
import { t } from '@superset-ui/core';
import { css, styled } from '@apache-superset/core/ui';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { useState, useEffect } from 'react';

dayjs.extend(quarterOfYear);

const ContentStyleWrapper = styled.div`
  ${({ theme }) => css`
    .pop-div {
      position: relative;
      top: 100%;
      left: 0;
      z-index: 1100;
      // min-width: 300px;
      background-color: ${theme.colorBgBase};
      border-radius: 4px;
      // padding: 8px 12px;
      border-color: ${theme.colorSuccessBorderHover};
    }
    .preset-shortcuts {
      margin-bottom: 12px;
    }
    .preset-shortcut {
      padding: 2px 10px;
      cursor: pointer;
      border-radius: 2px;
      // margin: 4px 0;
      background-color: ${theme.colorBgBase};
      border: 1px solid transparent;

      :hover {
        border-color: ${theme.colorPrimaryBorderHover};
        border-radius: 4px;
        border-width: 2px;
      }
    }
    .custom-picker {
    }
  `}
`;

export type tDateRange = [Dayjs, Dayjs];

type DateRangePickerProps = {
  value?: tDateRange | null;
  onChange?: (dates: tDateRange | null) => void;
};

// 预设快捷选项
export const presetShortcuts = [
  {
    key: 'today',
    label: t('Today'),
    value: [dayjs().startOf('day'), dayjs().endOf('day')] as tDateRange,
  },
  {
    key: 'yesterday',
    label: t('Yesterday'),
    value: [
      dayjs().subtract(1, 'day').startOf('day'),
      dayjs().subtract(1, 'day').endOf('day'),
    ] as tDateRange,
  },
  {
    key: 'dayBeforeYesterday',
    label: t('Day before Yesterday'),
    value: [
      dayjs().subtract(2, 'day').startOf('day'),
      dayjs().subtract(2, 'day').endOf('day'),
    ] as tDateRange,
  },
  {
    key: 'last7Days',
    label: t('Last 7 days'),
    value: [
      dayjs().subtract(7, 'day').startOf('day'),
      dayjs().endOf('day'),
    ] as tDateRange,
  },
  {
    key: 'thisWeek',
    label: t('This week'),
    value: [dayjs().startOf('week'), dayjs().endOf('day')] as tDateRange,
  },
  {
    key: 'lastWeek',
    label: t('Last week'),
    value: [
      dayjs().subtract(1, 'week').startOf('week'),
      dayjs().subtract(1, 'week').endOf('week'),
    ] as tDateRange,
  },
  {
    key: 'thisMonth',
    label: t('This month'),
    value: [dayjs().startOf('month'), dayjs().endOf('day')] as tDateRange,
  },
  {
    key: 'lastMonth',
    label: t('Last month'),
    value: [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month'),
    ] as tDateRange,
  },
  {
    key: 'thisQuarter',
    label: t('This quarter'),
    value: [dayjs().startOf('quarter'), dayjs().endOf('day')] as tDateRange,
  },
  {
    key: 'lastQuarter',
    label: t('Last quarter'),
    value: [
      dayjs().subtract(1, 'quarter').startOf('quarter'),
      dayjs().subtract(1, 'quarter').endOf('quarter'),
    ] as tDateRange,
  },
];

export function getTimeRangeByKey(key: string = '') {
  if (!key) {
    return null;
  }

  const timerange = key.toLowerCase();
  const shortcuts = presetShortcuts.filter(
    shortcut => shortcut.key.toLowerCase() === timerange,
  );
  if (shortcuts.length > 0) {
    const [start, end] = shortcuts[0].value;
    const formattedStart = start.format('YYYY-MM-DD HH:mm:ss.000000');
    const formattedEnd = end.format('YYYY-MM-DD HH:mm:ss.999999');
    return `${formattedStart} : ${formattedEnd}`;
  }
  return null;
}

export default function DateRangePicker({
  value,
  onChange,
}: DateRangePickerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempValue, setTempValue] = useState<tDateRange | undefined>(
    value ? [...value] : undefined,
  );

  // 检测是否为移动端
  useEffect(() => {
    const checkIfMobile = () => {
      const widthMatch = window.matchMedia('(max-width: 768px)').matches;
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
      setIsMobile(widthMatch || isMobile);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // 应用预设值
  const handlePresetSelect = (presetValue: tDateRange) => {
    onChange?.(presetValue);
    setTempValue(presetValue);
    setShowCustomPicker(false);
  };

  // 处理自定义日期选择
  const handleCustomChange = (dates: tDateRange | null) => {
    if (dates) {
      setTempValue(dates);
      onChange?.([dates[0].startOf('day'), dates[1].endOf('day')]);
    } else {
      setTempValue(undefined);
      onChange?.(null);
    }
    setShowCustomPicker(false);
  };

  const displayValue = value
    ? `${value[0].format('YYYY-MM-DD')} ~ ${value[1].format('YYYY-MM-DD')}`
    : t('Select date range');

  return (
    <ContentStyleWrapper>
      <div
        // direction="vertical"
        // size="middle"
        onClick={() => setShowCustomPicker(!showCustomPicker)}
      >
        <span>{displayValue}</span>

        {showCustomPicker && (
          <div className="pop-div">
            <div className="preset-shortcuts">
              {presetShortcuts.map((shortcut, index) => (
                <div
                  className="preset-shortcut"
                  key={index}
                  onClick={() => handlePresetSelect(shortcut.value)}
                >
                  {shortcut.label}
                </div>
              ))}
            </div>

            {!isMobile && (
              <div className="custom-picker" onClick={e => e.stopPropagation()}>
                <RangePicker
                  allowClear={false}
                  value={tempValue}
                  onChange={handleCustomChange}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ContentStyleWrapper>
  );
}

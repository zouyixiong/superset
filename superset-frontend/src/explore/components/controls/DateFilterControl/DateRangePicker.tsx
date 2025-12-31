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
import { Space } from '@superset-ui/core/components';
import { RangePicker } from '@superset-ui/core/components/DatePicker';
import type { RangePickerProps } from '@superset-ui/core/components/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { t } from '@superset-ui/core';

dayjs.extend(quarterOfYear);

type DateRange = [Dayjs, Dayjs];

type DateRangePickerProps = {
  value?: DateRange | null;
  onChange?: (dates: DateRange | null) => void;
};

export default function DateRangePicker({
  value,
  onChange,
}: DateRangePickerProps) {
  // 预设快捷选项
  const presetShortcuts = [
    {
      label: t('Today'),
      value: [dayjs().startOf('day'), dayjs().endOf('day')] as DateRange,
    },
    {
      label: t('Yesterday'),
      value: [
        dayjs().subtract(1, 'day').startOf('day'),
        dayjs().subtract(1, 'day').endOf('day'),
      ] as DateRange,
    },
    {
      label: t('This week'),
      value: [dayjs().startOf('week'), dayjs().endOf('day')] as DateRange,
    },
    {
      label: t('Last week'),
      value: [
        dayjs().subtract(1, 'week').startOf('week'),
        dayjs().subtract(1, 'week').endOf('week'),
      ] as DateRange,
    },
    {
      label: t('This month'),
      value: [dayjs().startOf('month'), dayjs().endOf('day')] as DateRange,
    },
    {
      label: t('Last month'),
      value: [
        dayjs().subtract(1, 'month').startOf('month'),
        dayjs().subtract(1, 'month').endOf('month'),
      ] as DateRange,
    },
    {
      label: t('This quarter'),
      value: [dayjs().startOf('quarter'), dayjs().endOf('day')] as [
        Dayjs,
        Dayjs,
      ],
    },
  ];

  // 扩展 RangePickerProps 类型，添加 shortcuts 属性
  const rangePickerProps: RangePickerProps = {
    value,
    onChange: (dates: DateRange | null) => {
      if (dates) {
        onChange?.([dates[0].startOf('day'), dates[1].endOf('day')]);
      } else {
        onChange?.(null);
      }
    },
    presets: presetShortcuts,
    format: 'YYYY-MM-DD',
    allowClear: false,
    showTime: false,
  };

  return (
    <Space direction="vertical" size="middle">
      <RangePicker {...rangePickerProps} />
    </Space>
  );
}

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
import { useState, useEffect, useRef } from 'react';
import { NO_TIME_RANGE, fetchTimeRange } from '@superset-ui/core';
import { css, styled } from '@apache-superset/core/ui';
import { Constants } from '@superset-ui/core/components';
import ControlHeader from 'src/explore/components/ControlHeader';
import { useDebouncedEffect } from 'src/explore/exploreUtils';
import { noOp } from 'src/utils/common';
import DateRangePicker from './DateRangePicker';

import { DateFilterControlProps } from './types';
import { useDefaultTimeFilter } from './utils';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

const ContentStyleWrapper = styled.div`
  ${({ theme }) => css`
    max-width: 244px;
  `}
`;

export default function DateFilterLabel(props: DateFilterControlProps) {
  const { onChange, onClosePopover = noOp } = props;
  const defaultTimeFilter = useDefaultTimeFilter();

  const value = props.value ?? defaultTimeFilter;

  // 设置默认值为昨天
  const [timeRangeValue, setTimeRangeValue] = useState<[Dayjs, Dayjs] | null>(
    () => {
      if (value && value !== NO_TIME_RANGE && value.includes(' : ')) {
        const [start, end] = value.split(' : ');
        const startDate = dayjs(start);
        const endDate = dayjs(end);

        if (startDate.isValid() && endDate.isValid()) {
          return [startDate, endDate];
        }
      }
      // 默认值为昨天
      const yesterday = dayjs().subtract(1, 'day');
      return [yesterday, yesterday];
    },
  );
  // 使用ref跟踪是否是初始渲染
  const isInitialMount = useRef(true);

  const updateTimeRange = (range?: [Dayjs, Dayjs]) => {
    setTimeout(() => {
      if (!range) {
        setTimeRangeValue(null);
      } else {
        const [startDate, endDate] = range;
        setTimeRangeValue([startDate, endDate]);
      }
    }, 0);
  };

  // 解析时间范围字符串为日期范围
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (value && value !== NO_TIME_RANGE && value.includes(' : ')) {
        const [start, end] = value.split(' : ');
        const startDate = dayjs(start);
        const endDate = dayjs(end);

        if (startDate.isValid() && endDate.isValid()) {
          // 使用setTimeout确保状态更新不会在effect同步执行
          updateTimeRange([startDate, endDate]);
        } else {
          updateTimeRange();
        }
      } else {
        // 如果没有提供值，则默认为昨天
        const yesterday = dayjs().subtract(1, 'day');
        updateTimeRange([yesterday, yesterday]);
      }
    }
  }, [value]);

  useDebouncedEffect(
    () => {
      if (timeRangeValue) {
        const [start, end] = timeRangeValue;
        const newTimeRange = `${start.format('YYYY-MM-DD')} : ${end.format('YYYY-MM-DD')}`;

        fetchTimeRange(newTimeRange);
      }
    },
    Constants.SLOW_DEBOUNCE,
    [timeRangeValue],
  );

  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    setTimeRangeValue(dates);
    // 日期选择后直接触发 onSave
    setTimeout(() => {
      if (dates) {
        const [start, end] = dates;
        // 格式化为 Superset 时间范围格式
        const formattedStart = start.format('YYYY-MM-DD');
        const formattedEnd = end.format('YYYY-MM-DD HH:mm:ss');
        onChange(`${formattedStart} : ${formattedEnd}`);
      } else {
        onChange(NO_TIME_RANGE);
      }
      onClosePopover();
    }, 0);
  };

  return (
    <>
      <ControlHeader {...props} />
      <ContentStyleWrapper>
        <DateRangePicker
          value={timeRangeValue}
          onChange={handleDateRangeChange}
        />
      </ContentStyleWrapper>
    </>
  );
}

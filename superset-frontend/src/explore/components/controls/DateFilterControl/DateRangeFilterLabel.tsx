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
import {
  ReactNode,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  t,
  NO_TIME_RANGE,
  useCSSTextTruncation,
  fetchTimeRange,
} from '@superset-ui/core';
import { css, styled, useTheme, SupersetTheme } from '@apache-superset/core/ui';
import {
  Button,
  Constants,
  Divider,
  Tooltip,
} from '@superset-ui/core/components';
import ControlHeader from 'src/explore/components/ControlHeader';
import { Icons } from '@superset-ui/core/components/Icons';
import { useDebouncedEffect } from 'src/explore/exploreUtils';
import { noOp } from 'src/utils/common';
import ControlPopover from '../ControlPopover/ControlPopover';
import DateRangePicker from './DateRangePicker';

import { DateFilterControlProps } from './types';
import { DateFilterTestKey, useDefaultTimeFilter } from './utils';
import { DateLabel } from './components';
import { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import dayjs from 'dayjs';

dayjs.extend(quarterOfYear);

const ContentStyleWrapper = styled.div`
  ${({ theme }) => css`
    .ant-row {
      margin-top: 8px;
    }

    .ant-picker {
      padding: 4px 17px 4px;
      border-radius: 4px;
    }

    .ant-divider-horizontal {
      margin: 16px 0;
    }

    .control-label {
      font-size: ${theme.fontSizeSM}px;
      line-height: 16px;
      margin: 8px 0;
    }

    .section-title {
      font-style: normal;
      font-weight: ${theme.fontWeightStrong};
      font-size: 15px;
      line-height: 24px;
      margin-bottom: 8px;
    }

    .control-anchor-to {
      margin-top: 16px;
    }

    .control-anchor-to-datetime {
      width: 217px;
    }

    .footer {
      text-align: right;
    }
  `}
`;

const IconWrapper = styled.span`
  span {
    margin-right: ${({ theme }) => 2 * theme.sizeUnit}px;
    vertical-align: middle;
  }
  .text {
    vertical-align: middle;
  }
  .error {
    color: ${({ theme }) => theme.colorError};
  }
`;

const getTooltipTitle = (
  isLabelTruncated: boolean,
  label: string | undefined,
  range: string | undefined,
) =>
  isLabelTruncated ? (
    <div>
      {label && <strong>{label}</strong>}
      {range && (
        <div
          css={(theme: SupersetTheme) => css`
            margin-top: ${theme.sizeUnit}px;
          `}
        >
          {range}
        </div>
      )}
    </div>
  ) : (
    range || null
  );

export default function DateFilterLabel(props: DateFilterControlProps) {
  const {
    name,
    onChange,
    onOpenPopover = noOp,
    onClosePopover = noOp,
    isOverflowingFilterBar = false,
  } = props;
  const defaultTimeFilter = useDefaultTimeFilter();

  const value = props.value ?? defaultTimeFilter;
  const [actualTimeRange, setActualTimeRange] = useState<string>(value);

  const [show, setShow] = useState<boolean>(false);
  const [lastFetchedTimeRange, setLastFetchedTimeRange] = useState(value);
  const [timeRangeValue, setTimeRangeValue] = useState<[Dayjs, Dayjs] | null>(
    null,
  );
  const [validTimeRange, setValidTimeRange] = useState<boolean>(false);
  const [evalResponse, setEvalResponse] = useState<string>(value);
  const [tooltipTitle, setTooltipTitle] = useState<ReactNode | null>(value);
  const theme = useTheme();
  const [labelRef, labelIsTruncated] = useCSSTextTruncation<HTMLSpanElement>();

  // 使用ref跟踪是否是初始渲染
  const isInitialMount = useRef(true);

  const updateTimeRange = (range?: [Dayjs, Dayjs]) => {
    setTimeout(() => {
      if (!range) {
        setTimeRangeValue(null);
        setValidTimeRange(false);
        setTooltipTitle(null);
      } else {
        const [startDate, endDate] = range;
        setTimeRangeValue([startDate, endDate]);
        setActualTimeRange(
          `${startDate.format('YYYY-MM-DD')} : ${endDate.format('YYYY-MM-DD')}`,
        );
        setValidTimeRange(true);
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
        updateTimeRange();
      }
    }
  }, [value]);

  useDebouncedEffect(
    () => {
      if (timeRangeValue) {
        const [start, end] = timeRangeValue;
        const newTimeRange = `${start.format('YYYY-MM-DD')} : ${end.format('YYYY-MM-DD')}`;

        fetchTimeRange(newTimeRange).then(({ value: actualRange, error }) => {
          if (error) {
            setEvalResponse(error || '');
            setValidTimeRange(false);
          } else {
            setEvalResponse(actualRange || newTimeRange);
            setValidTimeRange(true);
          }
        });
      } else if (timeRangeValue === null) {
        setEvalResponse(NO_TIME_RANGE);
        setValidTimeRange(true);
      }
    },
    Constants.SLOW_DEBOUNCE,
    [timeRangeValue],
  );

  function onSave() {
    if (timeRangeValue) {
      const [start, end] = timeRangeValue;
      // 格式化为 Superset 时间范围格式
      const formattedStart = start.format('YYYY-MM-DD');
      const formattedEnd = end.format('YYYY-MM-DD HH:mm:ss');
      onChange(`${formattedStart} : ${formattedEnd}`);
    } else {
      onChange(NO_TIME_RANGE);
    }
    setShow(false);
    onClosePopover();
  }

  function onOpen() {
    if (value && value !== NO_TIME_RANGE && value.includes(' : ')) {
      const [start, end] = value.split(' : ');
      const startDate = dayjs(start);
      const endDate = dayjs(end);

      if (startDate.isValid() && endDate.isValid()) {
        setTimeRangeValue([startDate, endDate]);
      } else {
        setTimeRangeValue(null);
      }
    } else {
      setTimeRangeValue(null);
    }
    setShow(true);
    onOpenPopover();
  }

  function onHide() {
    if (value && value !== NO_TIME_RANGE && value.includes(' : ')) {
      const [start, end] = value.split(' : ');
      const startDate = dayjs(start);
      const endDate = dayjs(end);

      if (startDate.isValid() && endDate.isValid()) {
        setTimeRangeValue([startDate, endDate]);
      } else {
        setTimeRangeValue(null);
      }
    } else {
      setTimeRangeValue(null);
    }
    setShow(false);
    onClosePopover();
  }

  const toggleOverlay = () => {
    if (show) {
      onHide();
    } else {
      onOpen();
    }
  };

  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    setTimeRangeValue(dates);
    if (dates) {
      const [start, end] = dates;
      setActualTimeRange(
        `${start.format('YYYY-MM-DD')} : ${end.format('YYYY-MM-DD')}`,
      );
    } else {
      setActualTimeRange(NO_TIME_RANGE);
    }
  };

  const overlayContent = (
    <ContentStyleWrapper>
      <div className="section-title">{t('Select Date Range')}</div>
      <DateRangePicker
        value={timeRangeValue}
        onChange={handleDateRangeChange}
      />
      <Divider />
      <div>
        <div className="section-title">{t('Actual time range')}</div>
        {validTimeRange && (
          <div>
            {timeRangeValue
              ? `${timeRangeValue[0].format('YYYY-MM-DD')} : ${timeRangeValue[1].format('YYYY-MM-DD')}`
              : t('No filter')}
          </div>
        )}
        {!validTimeRange && (
          <IconWrapper className="warning">
            <Icons.ExclamationCircleOutlined iconColor={theme.colorError} />
            <span className="text error">{evalResponse}</span>
          </IconWrapper>
        )}
      </div>
      <Divider />
      <div className="footer">
        <Button
          buttonStyle="secondary"
          cta
          key="cancel"
          onClick={onHide}
          data-test={DateFilterTestKey.CancelButton}
        >
          {t('CANCEL')}
        </Button>
        <Button
          buttonStyle="primary"
          cta
          disabled={!validTimeRange}
          key="apply"
          onClick={onSave}
          data-test={DateFilterTestKey.ApplyButton}
        >
          {t('APPLY')}
        </Button>
      </div>
    </ContentStyleWrapper>
  );

  const popoverContent = (
    <ControlPopover
      autoAdjustOverflow={false}
      trigger="click"
      placement="right"
      content={overlayContent}
      title={
        <IconWrapper>
          <Icons.EditOutlined />
          <span className="text">{t('Edit time range')}</span>
        </IconWrapper>
      }
      defaultOpen={show}
      open={show}
      onOpenChange={toggleOverlay}
      overlayStyle={{ width: '600px' }}
      destroyTooltipOnHide
      getPopupContainer={nodeTrigger =>
        isOverflowingFilterBar
          ? (nodeTrigger.parentNode as HTMLElement)
          : document.body
      }
      overlayClassName="time-range-popover"
    >
      <Tooltip placement="top" title={tooltipTitle}>
        <DateLabel
          name={name}
          aria-labelledby={`filter-name-${props.name}`}
          aria-describedby={`date-label-${props.name}`}
          label={actualTimeRange}
          isActive={show}
          isPlaceholder={actualTimeRange === NO_TIME_RANGE}
          data-test={DateFilterTestKey.PopoverOverlay}
          ref={labelRef}
        />
      </Tooltip>
    </ControlPopover>
  );

  return (
    <>
      <ControlHeader {...props} />
      {popoverContent}
    </>
  );
}

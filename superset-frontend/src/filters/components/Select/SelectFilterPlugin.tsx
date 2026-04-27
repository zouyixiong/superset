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
/* eslint-disable no-param-reassign */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppSection,
  DataMask,
  ensureIsArray,
  ExtraFormData,
  getColumnLabel,
  JsonObject,
  finestTemporalGrainFormatter,
  t,
  tn,
} from '@superset-ui/core';
import { styled } from '@apache-superset/core/ui';
import { GenericDataType } from '@apache-superset/core/api/core';
import { debounce, isUndefined } from 'lodash';
import { useImmerReducer } from 'use-immer';
import {
  FormItem,
  LabeledValue,
  Select,
  Space,
  Constants,
} from '@superset-ui/core/components';
import {
  hasOption,
  propertyComparator,
} from '@superset-ui/core/components/Select/utils';
import { FilterBarOrientation } from 'src/dashboard/types';
import { getDataRecordFormatter, getSelectExtraFormData } from '../../utils';
import { FilterPluginStyle, StatusMessage } from '../common';
import { PluginFilterSelectProps, SelectValue } from './types';

type DataMaskAction =
  | { type: 'ownState'; ownState: JsonObject }
  | {
      type: 'filterState';
      extraFormData: ExtraFormData;
      filterState: {
        value: SelectValue;
        label?: string;
        excludeFilterValues?: boolean;
      };
    };

function reducer(draft: DataMask, action: DataMaskAction) {
  switch (action.type) {
    case 'ownState':
      draft.ownState = {
        ...draft.ownState,
        ...action.ownState,
      };
      return draft;
    case 'filterState':
      if (
        JSON.stringify(draft.extraFormData) !==
        JSON.stringify(action.extraFormData)
      ) {
        draft.extraFormData = action.extraFormData;
      }
      if (
        JSON.stringify(draft.filterState) !== JSON.stringify(action.filterState)
      ) {
        draft.filterState = { ...draft.filterState, ...action.filterState };
      }

      return draft;
    default:
      return draft;
  }
}

const StyledSpace = styled(Space)<{
  inverseSelection: boolean;
  appSection: AppSection;
}>`
  display: flex;
  align-items: center;
  width: 100%;

  .exclude-select {
    width: 80px;
    flex-shrink: 0;
  }

  &.ant-space {
    .ant-space-item {
      width: ${({ inverseSelection }) => (!inverseSelection ? '100%' : 'auto')};
    }
  }
`;

// Keep track of orientation changes outside component with filter ID
const orientationMap = new Map<string, FilterBarOrientation>();

export default function PluginFilterSelect(props: PluginFilterSelectProps) {
  const {
    coltypeMap,
    data: rawData,
    filterState,
    formData,
    height,
    isRefreshing,
    width,
    setDataMask,
    setHoveredFilter,
    unsetHoveredFilter,
    setFocusedFilter,
    unsetFocusedFilter,
    setFilterActive,
    appSection,
    showOverflow,
    parentRef,
    inputRef,
    filterBarOrientation,
    clearAllTrigger,
    onClearAllComplete,
  } = props;
  const {
    enableEmptyFilter,
    creatable,
    multiSelect,
    showSearch,
    inverseSelection,
    defaultToFirstItem,
    searchAllOptions,
  } = formData;

  // Guard against null data from parent component
  const data = rawData ?? [];

  const groupby = useMemo(
    () => ensureIsArray(formData.groupby).map(getColumnLabel),
    [formData.groupby],
  );
  const [col] = groupby;
  const bindCol = useMemo(
    () => ensureIsArray(formData.groupby)[1] as string | undefined,
    [formData.groupby],
  );
  const [initialColtypeMap] = useState(coltypeMap);
  const [search, setSearch] = useState('');
  const isChangedByUser = useRef(false);
  const prevDataRef = useRef(data ?? []);
  const [dataMask, dispatchDataMask] = useImmerReducer(reducer, {
    extraFormData: {},
    filterState,
  });
  const datatype: GenericDataType = coltypeMap[col];
  const labelFormatter = useMemo(
    () =>
      getDataRecordFormatter({
        timeFormatter: finestTemporalGrainFormatter(data.map(el => el[col])),
      }),
    [data, col],
  );
  const [excludeFilterValues, setExcludeFilterValues] = useState(
    isUndefined(filterState?.excludeFilterValues)
      ? true
      : filterState?.excludeFilterValues,
  );

  const prevExcludeFilterValues = useRef(excludeFilterValues);

  const hasOnlyOrientationChanged = useRef(false);

  useEffect(() => {
    // Get previous orientation for this specific filter
    const previousOrientation = orientationMap.get(formData.nativeFilterId);

    // Check if only orientation changed for this filter
    if (
      previousOrientation !== undefined &&
      previousOrientation !== filterBarOrientation
    ) {
      hasOnlyOrientationChanged.current = true;
    } else {
      hasOnlyOrientationChanged.current = false;
    }

    // Update orientation for this filter
    if (filterBarOrientation) {
      orientationMap.set(formData.nativeFilterId, filterBarOrientation);
    }
  }, [filterBarOrientation]);

  const updateDataMask = useCallback(
    (values: SelectValue) => {
      const emptyFilter =
        enableEmptyFilter && !inverseSelection && !values?.length;

      const suffix = inverseSelection && values?.length ? t(' (excluded)') : '';
      dispatchDataMask({
        type: 'filterState',
        extraFormData: getSelectExtraFormData(
          col,
          values,
          emptyFilter,
          excludeFilterValues && inverseSelection,
        ),
        filterState: {
          ...filterState,
          label: values?.length
            ? `${(values || [])
                .map(value => labelFormatter(value, datatype))
                .join(', ')}${suffix}`
            : undefined,
          value:
            appSection === AppSection.FilterConfigModal && defaultToFirstItem
              ? undefined
              : values,
          excludeFilterValues,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      appSection,
      col,
      datatype,
      defaultToFirstItem,
      dispatchDataMask,
      enableEmptyFilter,
      inverseSelection,
      excludeFilterValues,
      JSON.stringify(filterState),
      labelFormatter,
    ],
  );

  const isDisabled =
    appSection === AppSection.FilterConfigModal && defaultToFirstItem;

  const onSearch = useMemo(
    () =>
      debounce((search: string) => {
        setSearch(search);
        if (searchAllOptions) {
          dispatchDataMask({
            type: 'ownState',
            ownState: {
              coltypeMap: initialColtypeMap,
              search,
            },
          });
        }
      }, Constants.SLOW_DEBOUNCE),
    [dispatchDataMask, initialColtypeMap, searchAllOptions],
  );

  const handleBlur = useCallback(() => {
    unsetFocusedFilter();
    onSearch('');
  }, [onSearch, unsetFocusedFilter]);

  const handleChange = useCallback(
    (value?: SelectValue | number | string) => {
      const values = value === null ? [null] : ensureIsArray(value);

      if (values.length === 0) {
        updateDataMask(null);
      } else {
        updateDataMask(values);
      }

      isChangedByUser.current = true;
    },
    [updateDataMask, formData.nativeFilterId, clearAllTrigger],
  );

  const placeholderText =
    !data || data.length === 0
      ? t('No data')
      : tn('%s option', '%s options', data.length, data.length);

  const formItemExtra = useMemo(() => {
    if (filterState.validateMessage) {
      return (
        <StatusMessage status={filterState.validateStatus}>
          {filterState.validateMessage}
        </StatusMessage>
      );
    }
    return undefined;
  }, [filterState.validateMessage, filterState.validateStatus]);

  const uniqueOptions = useMemo(() => {
    const allOptions = new Set((data || []).map(el => el[col]));
    return [...allOptions].map((value: string) => ({
      label: labelFormatter(value, datatype),
      value,
      isNewOption: false,
    }));
  }, [data, datatype, col, labelFormatter]);

  const options = useMemo(() => {
    if (search && !multiSelect && !hasOption(search, uniqueOptions, true)) {
      uniqueOptions.unshift({
        label: search,
        value: search,
        isNewOption: true,
      });
    }
    return uniqueOptions;
  }, [multiSelect, search, uniqueOptions]);

  const sortComparator = useCallback(
    (a: LabeledValue, b: LabeledValue) => {
      // When sortMetric is specified, the backend already sorted the data correctly
      // Don't override the backend's metric-based sorting with frontend alphabetical sorting
      if (formData.sortMetric) {
        return 0; // Preserve the original order from the backend
      }

      // Only apply alphabetical sorting when no sortMetric is specified
      const labelComparator = propertyComparator('label');
      if (formData.sortAscending) {
        return labelComparator(a, b);
      }
      return labelComparator(b, a);
    },
    [formData.sortAscending, formData.sortMetric],
  );

  // Single effect: handles initialization + cascade cleanup + defaults.
  // All cascade-aware filtering happens here to avoid race conditions
  // between multiple effects dispatching conflicting state updates.
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasOnlyOrientationChanged.current) {
      return;
    }

    if (isDisabled) {
      updateDataMask(null);
      return;
    }

    // Detect actual data changes (for cascade cleanup).
    const safeData = data ?? [];
    const safePrev = prevDataRef.current ?? [];
    const hasDataChanged =
      safePrev.length !== safeData.length ||
      safePrev.some((row, i) => {
        const prevVal = row?.[col];
        const currVal = safeData?.[i]?.[col];
        return typeof prevVal === 'bigint' || typeof currVal === 'bigint'
          ? prevVal?.toString() !== currVal?.toString()
          : prevVal !== currVal;
      });

    // Cascade cleanup: when parent filter changes, child data updates.
    // Filter out any selected values that are no longer in the new data.
    if (hasDataChanged && hasInitializedRef.current && col && data.length > 0) {
      const validValues = new Set(data.map(row => row[col]));
      const currentValues = ensureIsArray(filterState.value);
      const remaining = currentValues.filter((v: any) => validValues.has(v));

      if (remaining.length < currentValues.length) {
        // Some values became invalid — apply cleaned-up state and return
        // early to avoid default-value logic below.
        if (remaining.length > 0 && bindCol) {
          // Map bindColumn → displayName for remaining values (backward compat)
          const valueToDisplayName = new Map<string, string>();
          data.forEach(row => {
            const bindVal = row[bindCol];
            const displayVal = row[col];
            if (bindVal !== undefined && displayVal !== undefined) {
              valueToDisplayName.set(`${bindVal}`, `${displayVal}`);
            }
          });
          if (valueToDisplayName.size > 0) {
            const mappedRemaining: (string | number | null)[] = [];
            remaining.forEach((v: any) => {
              const strV = `${v}`;
              if (valueToDisplayName.has(strV)) {
                mappedRemaining.push(valueToDisplayName.get(strV)!);
              } else {
                mappedRemaining.push(strV);
              }
            });
            updateDataMask(mappedRemaining);
          } else {
            updateDataMask(remaining);
          }
        } else if (remaining.length > 0) {
          updateDataMask(remaining);
        } else {
          updateDataMask(null);
        }
        prevDataRef.current = data;
        isChangedByUser.current = false;
        return;
      }
    }

    let valueToApply: SelectValue | null | undefined;

    if (filterState.value != null) {
      let mappedValue = filterState.value;

      // Filter out stale values
      if (col && data?.length > 0) {
        mappedValue = ensureIsArray(filterState.value).filter((v: any) => {
          const validValues = new Set(data.map(row => row[col]));
          return validValues.has(v);
        });
      }

      // Map bindColumn → displayName (backward compat)
      if (mappedValue.length && bindCol && data?.length > 0) {
        const valueToDisplayName = new Map<string, string>();
        data.forEach(row => {
          const bindVal = row[bindCol];
          const displayVal = row[col];
          if (bindVal !== undefined && displayVal !== undefined) {
            valueToDisplayName.set(`${bindVal}`, `${displayVal}`);
          }
        });
        if (valueToDisplayName.size > 0) {
          mappedValue = ensureIsArray(mappedValue).map((v: any) => {
            const strV = `${v}`;
            if (valueToDisplayName.has(strV)) {
              return valueToDisplayName.get(strV);
            }
            return strV;
          });
        }
      }

      if (mappedValue.length) {
        valueToApply = mappedValue;
      }
      if (mappedValue.length === 0 && data?.length > 0) {
        valueToApply = null;
      }
    }

    if (valueToApply !== undefined) {
      updateDataMask(valueToApply);
    } else if (!clearAllTrigger && data?.length > 0) {
      if (defaultToFirstItem) {
        const firstItem: SelectValue = groupby.map(gb => data[0][gb]) as string[];
        if (firstItem?.[0] !== undefined) {
          updateDataMask(firstItem);
        }
      } else if (formData?.defaultValue) {
        updateDataMask(formData.defaultValue);
      }
    }

    prevDataRef.current = data;
    hasInitializedRef.current = true;
    isChangedByUser.current = false;
  }, [
    isDisabled,
    enableEmptyFilter,
    defaultToFirstItem,
    formData?.defaultValue,
    data,
    groupby,
    col,
    bindCol,
    inverseSelection,
    clearAllTrigger,
    filterState.value,
    updateDataMask,
  ]);

  useEffect(() => {
    setDataMask(dataMask);
  }, [JSON.stringify(dataMask)]);

  useEffect(() => {
    if (clearAllTrigger) {
      dispatchDataMask({
        type: 'filterState',
        extraFormData: {},
        filterState: {
          value: undefined,
          label: undefined,
        },
      });

      updateDataMask(null);
      setSearch('');
      onClearAllComplete?.(formData.nativeFilterId);
    }
  }, [clearAllTrigger, onClearAllComplete, updateDataMask]);

  useEffect(() => {
    if (prevExcludeFilterValues.current !== excludeFilterValues) {
      dispatchDataMask({
        type: 'filterState',
        extraFormData: getSelectExtraFormData(
          col,
          filterState.value,
          !filterState.value?.length,
          excludeFilterValues && inverseSelection,
        ),
        filterState: {
          ...(filterState as {
            value: SelectValue;
            label?: string;
            excludeFilterValues?: boolean;
          }),
          excludeFilterValues,
        },
      });
      prevExcludeFilterValues.current = excludeFilterValues;
    }
  }, [excludeFilterValues]);

  const handleExclusionToggle = (value: string) => {
    setExcludeFilterValues(value === 'true');
  };

  return (
    <FilterPluginStyle height={height} width={width}>
      <FormItem
        validateStatus={filterState.validateStatus}
        extra={formItemExtra}
      >
        <StyledSpace
          appSection={appSection}
          inverseSelection={inverseSelection}
        >
          {appSection !== AppSection.FilterConfigModal && inverseSelection && (
            <Select
              className="exclude-select"
              value={`${excludeFilterValues}`}
              options={[
                { value: 'true', label: t('is not') },
                { value: 'false', label: t('is') },
              ]}
              onChange={handleExclusionToggle}
            />
          )}
          <Select
            name={formData.nativeFilterId}
            allowClear
            allowNewOptions={!searchAllOptions && creatable !== false}
            allowSelectAll={!searchAllOptions}
            value={filterState.value || []}
            disabled={isDisabled}
            getPopupContainer={
              showOverflow
                ? () => (parentRef?.current as HTMLElement) || document.body
                : (trigger: HTMLElement) =>
                    (trigger?.parentNode as HTMLElement) || document.body
            }
            showSearch={showSearch}
            mode={multiSelect ? 'multiple' : 'single'}
            placeholder={placeholderText}
            onClear={() => onSearch('')}
            onSearch={onSearch}
            onBlur={handleBlur}
            onFocus={setFocusedFilter}
            onMouseEnter={setHoveredFilter}
            onMouseLeave={unsetHoveredFilter}
            // @ts-ignore
            onChange={handleChange}
            ref={inputRef}
            loading={isRefreshing}
            oneLine={filterBarOrientation === FilterBarOrientation.Horizontal}
            invertSelection={inverseSelection && excludeFilterValues}
            options={options}
            sortComparator={sortComparator}
            onOpenChange={setFilterActive}
            className="select-container"
          />
        </StyledSpace>
      </FormItem>
    </FilterPluginStyle>
  );
}

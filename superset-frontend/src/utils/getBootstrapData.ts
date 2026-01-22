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
import { BootstrapData } from 'src/types/bootstrapTypes';
import { DEFAULT_BOOTSTRAP_DATA, URL_PARAMS } from 'src/constants';
import { getUrlParam } from 'src/utils/urlUtils';
import type { Locale } from '@superset-ui/core';

let cachedBootstrapData: BootstrapData | null = null;

export default function getBootstrapData(): BootstrapData {
  if (cachedBootstrapData === null) {
    const appContainer = document.getElementById('app');
    const dataBootstrap = appContainer?.getAttribute('data-bootstrap');
    cachedBootstrapData = dataBootstrap
      ? JSON.parse(dataBootstrap)
      : DEFAULT_BOOTSTRAP_DATA;

    // support URL params to control locale, use in embeded mode
    const locale = getUrlParam(URL_PARAMS.locale) as Locale;
    if (cachedBootstrapData && locale) {
      cachedBootstrapData.common.locale = locale;
      if (
        cachedBootstrapData.common.language_pack?.locale_data?.superset?.['']
      ) {
        cachedBootstrapData.common.language_pack.locale_data.superset[''].lang =
          locale;
      }
    }
  }

  // Add a fallback to ensure the returned value is always of type BootstrapData
  return cachedBootstrapData ?? DEFAULT_BOOTSTRAP_DATA;
}

const normalizePathWithFallback = (
  path: string | undefined,
  fallback: string,
): string => (path ?? fallback).replace(/\/$/, '');

const APPLICATION_ROOT_NO_TRAILING_SLASH = normalizePathWithFallback(
  getBootstrapData().common.application_root,
  DEFAULT_BOOTSTRAP_DATA.common.application_root,
);

const STATIC_ASSETS_PREFIX_NO_TRAILING_SLASH = normalizePathWithFallback(
  getBootstrapData().common.static_assets_prefix,
  DEFAULT_BOOTSTRAP_DATA.common.static_assets_prefix,
);

/**
 * @returns The configured application root
 */
export function applicationRoot(): string {
  return APPLICATION_ROOT_NO_TRAILING_SLASH;
}

/**
 * @returns The configured static assets prefix
 */
export function staticAssetsPrefix(): string {
  return STATIC_ASSETS_PREFIX_NO_TRAILING_SLASH;
}

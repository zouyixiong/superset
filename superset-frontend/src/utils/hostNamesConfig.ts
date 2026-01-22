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
import { initFeatureFlags } from '@superset-ui/core';
import getBootstrapData from './getBootstrapData';

function getDomainsConfig(): string[] {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    return [];
  }

  const availableDomains = new Set([window.location.hostname]);

  // don't do domain sharding if a certain query param is set
  const disableDomainSharding =
    new URLSearchParams(window.location.search).get('disableDomainSharding') ===
    '1';
  if (disableDomainSharding) {
    return Array.from(availableDomains);
  }

  const bootstrapData = getBootstrapData();
  // this module is a little special, it may be loaded before index.jsx,
  // where window.featureFlags get initialized
  // eslint-disable-next-line camelcase
  initFeatureFlags(bootstrapData.common.feature_flags);

  if (bootstrapData?.common?.conf?.SUPERSET_WEBSERVER_DOMAINS) {
    const domains = bootstrapData.common.conf
      .SUPERSET_WEBSERVER_DOMAINS as string[];
    domains.forEach((hostName: string) => {
      availableDomains.add(hostName);
    });
  }
  return Array.from(availableDomains);
}

// 可能引起循环引用，导致 getBootstrapData 中的 cachedBootstrapData 未定义先使用错误
// export const availableDomains: string[] = getDomainsConfig();
// export const allowCrossDomain: boolean = availableDomains.length > 1;

let cachedDomains: string[] | null = null;
export function availableDomains(): string[] {
  if (cachedDomains !== null) {
    return cachedDomains;
  }
  cachedDomains = getDomainsConfig();
  return cachedDomains;
}

export function domainShardingEnabled() {
  return availableDomains().length > 1;
}

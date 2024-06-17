#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DOMAIN_NAME } from '../lib/constants';
import { DataZonePreReqStack } from '../lib/data-zone-pre-req-stack';
import { DataZoneBlueprintStack } from '../lib/stacks/data-zone-blueprint-stack';
import { DataZoneDataSourceStack } from '../lib/stacks/data-zone-datasource-stack';
import { DataZoneDomainStack } from '../lib/stacks/data-zone-domain-stack';
import { DataZoneEnvProfileStack } from '../lib/stacks/data-zone-env-profile-stack';
import { DataZoneEnvironmentStack } from '../lib/stacks/data-zone-env-stack';
import { DataZoneFormsStack } from '../lib/stacks/data-zone-forms-stack';
import { DataZoneGlossaryStack } from '../lib/stacks/data-zone-glossary-stack';
import { DataZoneProjectMembershipStack } from '../lib/stacks/data-zone-project-membership-stack';
import { DataZoneProjectStack } from '../lib/stacks/data-zone-project-stack';

const app = new cdk.App();
const dataZonePreqStack = new DataZonePreReqStack(app, 'DataZonePreqStack', {});

const domainStack = new DataZoneDomainStack(app, 'DataZoneDomainStack', {
  domainExecutionRole: dataZonePreqStack.domainExecutionRole,
  domainKMSKey: dataZonePreqStack.domainKMSKey,
  domainName: DOMAIN_NAME,
});

const blueprintStack = new DataZoneBlueprintStack(app, 'DataZoneBlueprintStack', {
  domainId: domainStack.domainId,
  s3BucketForDataLake: dataZonePreqStack.s3BucketForDataLake,
  dzProvisioningRole: dataZonePreqStack.dzProvisioningRole,
  glueManageAccessRole: dataZonePreqStack.glueManageAccessRole,
});

const projectsStack = new DataZoneProjectStack(app, 'DataZoneProjectStack', {
  domainId: domainStack.domainId,
});

const projectMembershipsStack = new DataZoneProjectMembershipStack(app, 'DataZoneProjectMembershipStack', {
  projectMap: projectsStack.projectMap,
  domainId: domainStack.domainId,
});

projectMembershipsStack.node.addDependency(projectsStack);

const projectGlossaryStack = new DataZoneGlossaryStack(app, 'DataZoneProjectGlossaryStack', {
  projectMap: projectsStack.projectMap,
  glossaryCustomResource: dataZonePreqStack.glossaryCustomResource,
  glossaryTermCustomResource: dataZonePreqStack.glossaryTermCustomResource,
  domainId: domainStack.domainId,
});

projectGlossaryStack.node.addDependency(projectsStack);


const projectFormStack = new DataZoneFormsStack(app, 'DataZoneProjectFormsStack', {
  projectMap: projectsStack.projectMap,
  formCustomResource: dataZonePreqStack.formCustomResource,
  domainId: domainStack.domainId,
});

projectFormStack.node.addDependency(projectsStack);

const envProfileStack = new DataZoneEnvProfileStack(app, 'DataZoneEnvProfileStack', {
  projectMap: projectsStack.projectMap,
  defaultDataLakeBlueprintId: blueprintStack.dataLakeBluePrintId,
  defaultDataWarehouseBlueprintId: blueprintStack.dataWarehouseBluePrintId,
  domainId: domainStack.domainId,
});

envProfileStack.node.addDependency(projectsStack);
envProfileStack.node.addDependency(blueprintStack);

const envStack = new DataZoneEnvironmentStack(app, 'DataZoneEnvironmentStack', {
  envProfileMap: envProfileStack.envProfileMap,
  projectMap: projectsStack.projectMap,
  domainId: domainStack.domainId,
});

envStack.node.addDependency(envProfileStack);

const dataSourceStack = new DataZoneDataSourceStack(app, 'DataZoneDataSourceStack', {
  envMap: envStack.envMap,
  envProfileMap: envProfileStack.envProfileMap,
  projectMap: projectsStack.projectMap,
  domainId: domainStack.domainId,
});

dataSourceStack.node.addDependency(envStack);
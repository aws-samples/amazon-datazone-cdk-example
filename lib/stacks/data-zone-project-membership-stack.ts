// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { CfnProjectMembership } from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import projectConfigs = require('../config/project_config.json');

export interface DataZoneProjectMembershipStackProps extends cdk.StackProps {
  readonly domainId: string;
  readonly projectMap: Map<string, datazone.CfnProject>;
}

export class DataZoneProjectMembershipStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: DataZoneProjectMembershipStackProps) {
    super(scope, id, props);

    for (const projectConfiguration of projectConfigs) {
      const projectName = projectConfiguration?.projectName;
      const project = props.projectMap.get(projectName);
      if (project == undefined) {
        throw new Error('Configuration not present for project ' + projectName);
      }
      const projectId = project?.attrId;

      const projectMemberships = projectConfiguration.projectMembers;
      for (const projectMember of projectMemberships) {
        const member: CfnProjectMembership.MemberProperty = {
          userIdentifier: projectMember.memberIdentifierType == 'UserIdentifier' ? projectMember.memberIdentifier : undefined,
          groupIdentifier: projectMember.memberIdentifierType == 'GroupIdentifier' ? projectMember.memberIdentifier : undefined,
        };

        const projectMembership = new CfnProjectMembership(this, projectName + 'Contributor', {
          designation: 'PROJECT_CONTRIBUTOR',
          domainIdentifier: props.domainId,
          member: member,
          projectIdentifier: projectId,
        });

        projectMembership.node.addDependency(project);
      }
    }

  }

}

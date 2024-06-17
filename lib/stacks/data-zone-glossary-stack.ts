// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { CustomResource } from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import projectGlossaryConfigs = require('../config/project_glossary_config.json');

export interface DataZoneGlossaryStackProps extends cdk.StackProps {
  readonly domainId: string;
  readonly glossaryCustomResource: Provider;
  readonly glossaryTermCustomResource: Provider;
  readonly projectMap: Map<string, datazone.CfnProject>;
}

export class DataZoneGlossaryStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: DataZoneGlossaryStackProps) {
    super(scope, id, props);

    for (const projectGlossaryConfiguration of projectGlossaryConfigs) {
      const projectName = projectGlossaryConfiguration.projectName;
      const project = props.projectMap.get(projectName);
      if (project == undefined) {
        throw new Error('Configuration not present for project ' + projectName);
      }
      const projectId = project?.attrId;

      const glossaries = projectGlossaryConfiguration.projectGlossaries;
      let prevGlossary = null;
      let prevGlossaryTerm = null;

      for (const glossary of glossaries) {
        const glossaryName = glossary.GlossaryName;
        const glossaryDescription = glossary.GlossaryDescription;

        const glossaryResourceId = glossaryName + 'Glossary';
        const glossaryCR = new CustomResource(this, glossaryResourceId, {
          serviceToken: props.glossaryCustomResource.serviceToken,
          properties: {
            DomainIdentifier: props.domainId,
            OwningProjectIdentifier: projectId,
            GlossaryName: glossaryName,
            GlossaryDescription: glossaryDescription,
          },
        });

        const glossaryId = glossaryCR.getAttString('GlossaryId');

        for (const glossaryTerm of glossary.GlossaryTerms) {
          const name = glossaryTerm.Name;
          const glossaryTermResourceId = glossaryResourceId + '#' + name + 'GlossaryTerm';
          const glossaryTermCR = new CustomResource(this, glossaryTermResourceId, {
            serviceToken: props.glossaryTermCustomResource.serviceToken,
            properties: {
              DomainIdentifier: props.domainId,
              GlossaryIdentifier: glossaryId,
              Name: name,
              ShortDescription: glossaryTerm.ShortDescription,
              LongDescription: glossaryTerm.LongDescription,
              // Setting up TermRelations via Custom Resource is not supported, need to figure out
              // the ideal experience.
              TermRelations: glossaryTerm.TermRelations == null ? {} : glossaryTerm.TermRelations,
            },
          });
          // Add dependency to prevent huge number of calls as the number of glossary terms can be large
          if (prevGlossaryTerm != null) {
            glossaryTermCR.node.addDependency(prevGlossaryTerm);

          }
          prevGlossaryTerm = glossaryTermCR;
        }
        // Add dependency to prevent huge number of calls as the number of glossaries can be large
        if (prevGlossary != null) {
          glossaryCR.node.addDependency(prevGlossary);
        }
        prevGlossary = glossaryCR;
      }
    }

  }

}

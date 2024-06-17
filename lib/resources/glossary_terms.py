"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
"""

import sys
import boto3
from uuid import uuid4

def handler(event, context):
    """
    The handler function is the entry point for the AWS Lambda function. It receives an event and context object.

    Args:
        event (dict): A dictionary containing the event data.
        context (object): An object containing information about the invocation, function, and execution environment.

    Returns:
        dict: A dictionary containing the status and optionally, the PhysicalResourceId and Data.

    This function is designed to handle three types of requests: Create, Update, and Delete. It performs the following
    tasks:

    1. Retrieves the required parameters from the event object.
    2. Validates the required parameters.
    3. Initializes the AWS DataZone client.
    4. Based on the request type, it calls the appropriate helper functions to create, update, or delete a glossary term.
    5. Returns the appropriate response.
    """
    print('Received event:', event)

    domain_identifier = event['ResourceProperties'].get('DomainIdentifier', None)
    glossary_identifier = event['ResourceProperties'].get('GlossaryIdentifier', None)
    name = event['ResourceProperties'].get('Name', None)
    status = event['ResourceProperties'].get('Status', None)
    short_description = event['ResourceProperties'].get('ShortDescription', None)
    long_description = event['ResourceProperties'].get('LongDescription', None)
    # Term Relations are currently not supported in the custom resource
    term_relations = event['ResourceProperties'].get('TermRelations', None)

    if not domain_identifier or not glossary_identifier or not name:
        raise Exception(
            "Invalid event. "
            "Missing DomainIdentifier or GlossaryIdentifier or Name."
        )

    if not status:
        print(f"Status not specified for Glossary Term {name} in domain {domain_identifier}, glossary "
              f"{glossary_identifier}, defaulting to enabled")
        status = "ENABLED"

    client = boto3.client('datazone')

    if event['RequestType'] == 'Create':
        glossary_term_id = create_glossary_term(client, domain_identifier, glossary_identifier, name, short_description,
                                                long_description, status)
        response_data = {"GlossaryTermId": glossary_term_id}
        return {'status': 'SUCCESS', 'PhysicalResourceId': glossary_term_id, 'Data': response_data}

    elif event['RequestType'] == 'Update':
        identifier = event["PhysicalResourceId"]
        update_glossary_term(client, identifier, domain_identifier, glossary_identifier, name, short_description,
                             long_description, status)
        response_data = {"GlossaryId": identifier}
        return {'status': 'SUCCESS', 'PhysicalResourceId': identifier, 'Data': response_data}

    elif event['RequestType'] == 'Delete':
        identifier = event["PhysicalResourceId"]
        update_glossary_term(client, identifier, domain_identifier, glossary_identifier, name, short_description,
                             long_description, "DISABLED")
        delete_glossary_term(client, identifier, domain_identifier)

    return {'status': 'SUCCESS'}


def create_glossary_term(client, domain_identifier, glossary_identifier, name, short_description, long_description,
                         status):
    """
    Creates a new glossary term in the specified domain and glossary.

    Args:
        client (boto3.client): The AWS DataZone client.
        domain_identifier (str): The identifier of the domain.
        glossary_identifier (str): The identifier of the glossary.
        name (str): The name of the glossary term.
        short_description (str): The short description of the glossary term.
        long_description (str): The long description of the glossary term.
        status (str): The status of the glossary term (ENABLED or DISABLED).

    Returns:
        str: The identifier of the created glossary term.

    This function takes the required parameters, generates a unique client token, and calls the create_glossary_term
    method of the AWS Data Zone client. It prints a success message with the created glossary term identifier.
    """
    response = client.create_glossary_term(**get_non_null_arguments(dict(clientToken=str(uuid4()),
                                                                         domainIdentifier=domain_identifier,
                                                                         glossaryIdentifier=glossary_identifier,
                                                                         longDescription=long_description,
                                                                         name=name,
                                                                         shortDescription=short_description,
                                                                         status=status
                                                                         )))
    glossary_term_id = response["id"]
    print(f"Successfully created new glossary term with name {name} for domain {domain_identifier} glossary "
          f"{glossary_identifier}, received id {glossary_term_id}")
    return glossary_term_id


def update_glossary_term(client, identifier, domain_identifier, glossary_identifier, name, short_description,
                         long_description, status):
    """
    Updates an existing glossary term in the specified domain and glossary.

    Args:
        client (boto3.client): The AWS DataZone client.
        identifier (str): The identifier of the glossary term to update.
        domain_identifier (str): The identifier of the domain.
        glossary_identifier (str): The identifier of the glossary.
        name (str): The updated name of the glossary term.
        short_description (str): The updated short description of the glossary term.
        long_description (str): The updated long description of the glossary term.
        status (str): The updated status of the glossary term (ENABLED or DISABLED).

    This function takes the required parameters and calls the update_glossary_term method of the AWS Data Zone client.
    It prints a success message with the updated glossary term name and identifier.
    """
    response = client.update_glossary_term(**get_non_null_arguments(dict(domainIdentifier=domain_identifier,
                                                                         glossaryIdentifier=glossary_identifier,
                                                                         identifier=identifier,
                                                                         longDescription=long_description,
                                                                         name=name,
                                                                         shortDescription=short_description,
                                                                         status=status
                                                                         )))
    print(f"Successfully updated glossary term with name {name} and id {identifier} for domain {domain_identifier}")


def delete_glossary_term(client, identifier, domain_identifier):
    """
    Deletes an existing glossary term in the specified domain.

    Args:
        client (boto3.client): The AWS DataZone client.
        identifier (str): The identifier of the glossary term to delete.
        domain_identifier (str): The identifier of the domain.

    This function takes the required parameters and calls the delete_glossary_term method of the AWS Data Zone client.
    If an exception occurs during the deletion process, it prints an error message.
    """
    try:
        response = client.delete_glossary_term(
            domainIdentifier=domain_identifier,
            identifier=identifier
        )
    except Exception as e:
        print(f"Failed to delete glossary term due to {e}")


def get_non_null_arguments(kwargs):
    kwargs = {k: v for k, v in kwargs.items() if v}
    return kwargs

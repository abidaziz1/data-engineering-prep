param name string
param location string
param lakeName string

// Storage Blob Data Contributor
var blobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource factory 'Microsoft.DataFactory/factories@2018-06-01' = {
  // checkov:skip=CKV_AZURE_103: only the dev factory is connected to Git. Prod is published by the pipeline.
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    publicNetworkAccess: 'Disabled'
  }
}

resource lake 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: lakeName
}

resource grant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(lake.id, factory.id, blobDataContributor)
  scope: lake
  properties: {
    principalId: factory.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributor)
  }
}

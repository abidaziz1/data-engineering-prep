param name string
param location string
param zoneRedundant bool

resource lake 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  // checkov:skip=CKV_AZURE_206: ZRS is enough in prod, and dev uses LRS, because the lake can be rebuilt from the sources
  name: name
  location: location
  kind: 'StorageV2'
  sku: {
    name: zoneRedundant ? 'Standard_ZRS' : 'Standard_LRS'
  }
  properties: {
    isHnsEnabled: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: lake
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 14
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 14
    }
  }
}

resource zones 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = [for zone in [
  'raw'
  'clean'
  'curated'
]: {
  parent: blobs
  name: zone
}]

output id string = lake.id
output name string = lake.name

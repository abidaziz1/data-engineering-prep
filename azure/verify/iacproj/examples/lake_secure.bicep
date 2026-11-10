resource lake 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  // checkov:skip=CKV_AZURE_206: ZRS is enough, because the lake can be rebuilt from the sources
  name: 'stbrewlinelakeprod'
  location: 'westeurope'
  kind: 'StorageV2'
  sku: { name: 'Standard_ZRS' }
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

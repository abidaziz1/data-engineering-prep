targetScope = 'resourceGroup'

@allowed([
  'dev'
  'prod'
])
param envName string
param location string = resourceGroup().location
param alertEmail string
param budgetStart string = '2026-04-01'

module lake 'modules/lake.bicep' = {
  name: 'lake'
  params: {
    name: 'stbrewlinelake${envName}'
    location: location
    zoneRedundant: envName == 'prod'
  }
}

module factory 'modules/factory.bicep' = {
  name: 'factory'
  params: {
    name: 'adf-brewline-${envName}'
    location: location
    lakeName: lake.outputs.name
  }
}

module budget 'modules/budget.bicep' = {
  name: 'budget'
  params: {
    amount: envName == 'prod' ? 8000 : 800
    contactEmail: alertEmail
    startDate: budgetStart
  }
}

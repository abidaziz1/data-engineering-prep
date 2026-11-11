param amount int
param contactEmail string
param startDate string

resource budget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: 'budget-data-platform'
  properties: {
    category: 'Cost'
    amount: amount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    notifications: {
      forecast90: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 90
        thresholdType: 'Forecasted'
        contactEmails: [
          contactEmail
        ]
      }
      actual100: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        thresholdType: 'Actual'
        contactEmails: [
          contactEmail
        ]
      }
    }
  }
}

const START_YEAR = 2015
const END_YEAR = 2024

export const powerYears = Array.from(
  { length: END_YEAR - START_YEAR + 1 },
  (_, index) => START_YEAR + index,
)

export const powerSourceUrl = (latitude, longitude) => {
  const query = new URLSearchParams({
    parameters: 'T2M,PRECTOTCORR,WS2M,RH2M',
    community: 'RE',
    longitude: longitude.toFixed(4),
    latitude: latitude.toFixed(4),
    start: String(START_YEAR),
    end: String(END_YEAR),
    format: 'JSON',
  })
  return 'https://power.larc.nasa.gov/api/temporal/monthly/point?' + query.toString()
}

function annualSeries(parameter) {
  const values = powerYears.map((year) => Number(parameter[String(year) + '13']))
  if (values.some((value) => !Number.isFinite(value) || value === -999)) {
    throw new Error('NASA POWER returned an incomplete annual series for this point.')
  }
  return values
}

export function linearTrend(values) {
  const meanX = (values.length - 1) / 2
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length
  let numerator = 0
  let denominator = 0
  values.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY)
    denominator += (index - meanX) ** 2
  })
  const slope = numerator / denominator
  return {
    slope,
    change: values.at(-1) - values[0],
    perDecade: slope * 10,
  }
}

export async function getPowerPoint(latitude, longitude) {
  const sourceUrl = powerSourceUrl(latitude, longitude)
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error('NASA POWER request failed (' + response.status + '). Try again shortly.')

  const payload = await response.json()
  const parameters = payload?.properties?.parameter
  if (!parameters) throw new Error('NASA POWER returned an unexpected response.')

  const series = {
    temperature: annualSeries(parameters.T2M),
    precipitation: annualSeries(parameters.PRECTOTCORR),
    wind: annualSeries(parameters.WS2M),
    humidity: annualSeries(parameters.RH2M),
  }

  return {
    sourceUrl,
    years: powerYears,
    series,
    trends: Object.fromEntries(Object.entries(series).map(([key, values]) => [key, linearTrend(values)])),
    fetchedAt: new Date().toISOString(),
  }
}

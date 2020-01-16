export interface Autocomplete {
    code: string
    type: 'airport' | 'city'
    country_cases: any | null
    country_code: string
    main_airport_name?: string | null
    index_strings?: string[]
    name: string
    city_name?: string
    coordinates?: {
        lon: string
        lat: string
    }
    country_name: string
    state_code: string | null
    weight: number
    cases?: {
        da?: string
        vi?: string
        tv?: string
        ro?: string
        pr?: string
    }
}

export interface CityData {
    time_zone: string
    name: string | null
    coordinates: {
        lon: number
        lat: number
    } | null
    code: string
    cases: {
        vi: string
        tv: string
        ro: string
        pr: string
        da: string
    }
    name_translations: {
        en: string
    }
    country_code: string
    page_id: string
}

export interface IndexedCities {
    codeIndexed: {
        [key: string]: CityData
    }
    pageidIndexed: {
        [key: string]: CityData
    }
}

export interface TicketParser {
    segments: TicketParserSegment[]
    price: number
    airline: string
    currency: string
    imageKeyword: string
    imageSrc?: string
}

export interface TicketParserSegment {
    departure: TicketParserDepartureArrivalProps
    arrival: TicketParserDepartureArrivalProps
    origin: TicketParserOriginDestinationProps
    destination: TicketParserOriginDestinationProps
    duration: number
    stops: Array<string>
}

interface TicketParserDepartureArrivalProps {
    timestamp: number
    format?: string
}

export interface TicketParserOriginDestinationProps {
    code: string
    name: string
    city_code: string
    coordinates: coordinates
    case?: string
}

export interface CityNames {
    name: string
    city_code: string
    country_code: string
    coordinates: coordinates
}

interface coordinates {
    lat: number
    lon: number
}

export interface WeatherAPI {
    latitude: number
    longitude: number
    timezone: string
    daily: {
        data: WeatherData[]
    }
    offset: number
}

interface WeatherData {
    time: number
    summary: string
    icon: string
    sunriseTime: number
    sunsetTime: number
    moonPhase: number
    precipIntensity: number
    precipIntensityMax: number
    precipIntensityMaxTime: number
    precipProbability: number
    precipType: string
    temperatureHigh: number
    temperatureHighTime: number
    temperatureLow: number
    temperatureLowTime: number
    apparentTemperatureHigh: number
    apparentTemperatureHighTime: number
    apparentTemperatureLow: number
    apparentTemperatureLowTime: number
    dewPoint: number
    humidity: number
    pressure: number
    windSpeed: number
    windGust: number
    windGustTime: number
    windBearing: number
    cloudCover: number
    uvIndex: number
    uvIndexTime: number
    visibility: number
    ozone: number
    temperatureMin: number
    temperatureMinTime: number
    temperatureMax: number
    temperatureMaxTime: number
    apparentTemperatureMin: number
    apparentTemperatureMinTime: number
    apparentTemperatureMax: number
    apparentTemperatureMaxTime: number
}

export interface AnomalyPictureReturnType {
    imgAddr: string
    anomalyData: TicketParser
}

export interface GetWallUploadServerResponse {
    response: {
        upload_url: string
        album_id: number
        user_id: number
    }
}

export interface UploadPhotoResponse {
    server: number
    photo: Array<string>
    hash: string
}

export interface SaveWallPhotoResponse {
    response: Array<{
        id: number
        album_id: number
        owner_id: number
        user_id: number
        text: string
        date: number
        sizes: Array<{
            type: string
            url: string
            width: number
            height: number
        }>
        width: number
        height: number
    }>
}

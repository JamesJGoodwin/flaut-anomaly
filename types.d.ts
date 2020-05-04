export interface Autocomplete {
    code: string;
    type: 'airport' | 'city';
    country_cases: any;
    country_code: string;
    main_airport_name?: string | null;
    index_strings?: string[];
    name: string;
    city_name?: string;
    coordinates?: {
        lon: string;
        lat: string;
    };
    country_name: string;
    state_code: string | null;
    weight: number;
    cases?: {
        da?: string;
        vi?: string;
        tv?: string;
        ro?: string;
        pr?: string;
    };
}

export interface CityData {
    time_zone: string;
    name: string | null;
    coordinates: {
        lon: number;
        lat: number;
    } | null;
    code: string;
    cases: {
        vi: string;
        tv: string;
        ro: string;
        pr: string;
        da: string;
    };
    name_translations: {
        en: string;
    };
    country_code: string;
    page_id: string;
}

export interface IndexedCities {
    codeIndexed: {
        [key: string]: CityData;
    };
    pageidIndexed: {
        [key: string]: CityData;
    };
}

export interface TicketParser {
    segments: TicketParserSegment[];
    price: number;
    airline: string;
    currency: string;
    rawStr: string;
}

export interface TicketParserSegment {
    departure: TicketParserDepartureArrivalProps;
    arrival: TicketParserDepartureArrivalProps;
    origin: TicketParserOriginDestinationProps;
    destination: TicketParserOriginDestinationProps;
    duration: number;
    stops: Array<string>;
}

interface TicketParserDepartureArrivalProps {
    timestamp: number;
    format?: string;
}

export interface TicketParserOriginDestinationProps {
    code: string;
    name: string;
    cityCode: string;
    coordinates: Coordinates;
    case?: string;
}

export interface CityNames {
    name: string;
    cityCode: string;
    countryCode: string;
    coordinates: Coordinates;
}

interface Coordinates {
    lat: number;
    lon: number;
}

export interface WeatherAPI {
    latitude: number;
    longitude: number;
    timezone: string;
    daily: {
        data: WeatherData[];
    };
    offset: number;
}

interface WeatherData {
    time: number;
    summary: string;
    icon: string;
    sunriseTime: number;
    sunsetTime: number;
    moonPhase: number;
    precipIntensity: number;
    precipIntensityMax: number;
    precipIntensityMaxTime: number;
    precipProbability: number;
    precipType: string;
    temperatureHigh: number;
    temperatureHighTime: number;
    temperatureLow: number;
    temperatureLowTime: number;
    apparentTemperatureHigh: number;
    apparentTemperatureHighTime: number;
    apparentTemperatureLow: number;
    apparentTemperatureLowTime: number;
    dewPoint: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windGust: number;
    windGustTime: number;
    windBearing: number;
    cloudCover: number;
    uvIndex: number;
    uvIndexTime: number;
    visibility: number;
    ozone: number;
    temperatureMin: number;
    temperatureMinTime: number;
    temperatureMax: number;
    temperatureMaxTime: number;
    apparentTemperatureMin: number;
    apparentTemperatureMinTime: number;
    apparentTemperatureMax: number;
    apparentTemperatureMaxTime: number;
}

export interface AnomalyPictureReturnType {
    imgAddr: string;
    anomalyData: TicketParser;
}

export interface GetWallUploadServerResponse {
    response: {
        upload_url: string;
        album_id: number;
        user_id: number;
    };
}

export interface UploadPhotoResponse {
    server: number;
    photo: Array<string>;
    hash: string;
}

export interface SaveWallPhotoResponse {
    response: Array<{
        id: number;
        album_id: number;
        owner_id: number;
        user_id: number;
        text: string;
        date: number;
        sizes: Array<{
            type: string;
            url: string;
            width: number;
            height: number;
        }>;
        width: number;
        height: number;
    }>;
}

interface LatestList {
    show_to_affiiates: boolean;
    trip_class: number;
    origin: string;
    destination: string;
    depart_date: string;
    return_date: string | null;
    number_of_changes: number;
    value: number;
    found_at: string;
    distance: number;
    actual: boolean;
}

export interface Latest {
    success: boolean;
    data: LatestList[];
    error?: string | null;
}

export type AllowedStatuses = 'processing' | 'declined' | 'failed' | 'succeeded'

export interface HistoryEntry {
    id: number;
    origin: string;
    destination: string;
    there_date: Date;
    back_date?: Date;
    price: string;
    full_info: string;
    currency: string;
    status: AllowedStatuses;
    added_at: Date;
    status_descr: string;
    images?: ImageRecord[];
}

declare namespace WS {
    type ConnectionStates = 0 | 1 | 2 | 3

    interface Conn {
        conn: ConnectionStates;
    }

    interface SetConnAction {
        payload: number;
    }
}

declare global {
    interface Window {
        ws: WebSocket;
        startWebSocket(): void;
    }
}

export interface ImageRecord {
    id: number;
    destination: string;
    added_at: Date;
    name: string;
}

declare namespace WebSocketTransfer {
    type TransferTypes = 'authorization'
                        | 'authentication'
                        | 'latest-entries'
                        | 'new-entry'
                        | 'entry-status-update'
                        | 'upload-image'
                        | 'delete-image'
    type AuthResults = 'error' | 'success'

    interface MainBody {
        type: TransferTypes;
    }

    interface AuthLogin extends MainBody {
        data: {
            login: string;
            password: string;
        };
    }

    interface JWTValidate extends MainBody {
        data: {
            jwt: string;
            uuid: string;
        };
    }

    interface AuthResult extends MainBody {
        data: {
            result: AuthResults;
            reason?: string;
        };
    }

    interface GiveJWT extends MainBody {
        data: {
            result: AuthResults;
            payload: {
                uuid: string;
                jwt: string;
            };
        };
    }

    interface JWTError extends MainBody {
        data: {
            result: AuthResults;
            reason: string;
        };
    }

    interface HistoryEntries extends MainBody {
        data: Array<HistoryEntry>;
    }

    interface AskForLatest extends MainBody {
        data: {
            count: number;
        };
    }

    interface EntryIncoming extends MainBody {
        data: {
            entry: HistoryEntry;
        };
    }

    interface EntryStatusIncoming extends MainBody {
        data: {
            id: number;
            status: AllowedStatuses;
            status_descr?: string;
        };
    }

    interface UploadImage extends MainBody {
        data: {
            base64: string;
            mimeType: string;
            destinationCode: string;
        };
    }

    interface UploadImageResult extends MainBody {
        data: {
            result: AuthResults;
            image: ImageRecord;
            reason?: string;
        };
    }

    interface DeleteImage extends MainBody {
        data: {
            name: string;
        };
    }

    interface DeleteImageResult extends MainBody {
        data: {
            result: AuthResults;
            name: string;
            reason?: string;
        };
    }

    type DashboardIncoming = HistoryEntries & EntryIncoming & EntryStatusIncoming & UploadImage
    type ServerIncoming = AuthLogin & JWTValidate & AskForLatest & UploadImage & DeleteImage
    type ClientIncoming = GiveJWT & JWTError & AuthResult & UploadImageResult & DeleteImageResult
}

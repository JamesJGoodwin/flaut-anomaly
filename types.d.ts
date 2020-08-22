import pug from 'pug'

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

interface BaseVKResponse {
  error: { [key: string]: string | number }
}

export interface GetWallUploadServerResponse extends BaseVKResponse {
  response: {
    upload_url: string;
    album_id: number;
    user_id: number;
  };
}

export interface UploadPhotoResponse {
  server: number;
  photo: Array<string> | `'[]'`;
  hash: string;
}

export interface SaveWallPhotoResponse extends BaseVKResponse {
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
  _id?: string;
  origin: string;
  destination: string;
  departureDate: Date;
  backDate?: Date;
  price: number;
  fullInfo: TicketParser;
  currency: string;
  status: AllowedStatuses;
  createdAt: Date;
  statusDescription: string;
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
    awaitingUploadNotification: Array<boolean>;
    awaitingDeletionNotification: boolean;
    awaitingAdditionalLatests: boolean;
  }
}

export interface ImageRecord {
  _id?: string;
  destination: string;
  addedAt: Date;
  name: string;
}

type PugsKeys = 'anomaly' | 'dashboard'

export type PugTemplates = {
  [key in PugsKeys]?: pug.compileTemplate
}

export type LatestStatsReturnType = {
  succeeded: number
  failed: number
  declined: number
}

export type gUPAU = { password: string; uuid: string }
// schema2jsdoc - https://gist.github.com/RepComm/c1a2f1d8d8dc52d954eb01ab88866153
import PocketBaseImport, { RecordService, RecordModel } from "pocketbase";
interface users extends RecordModel {
  id: string;
  password: string;
  tokenKey: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name: string;
  avatar: string;
  oauthid: string;
  oauthusername: string;
  oauthprovider: string;
  uid: string;
  /**relation id, use .expand property*/
  libary: string;
  role: string;
  stripe: string;
  newsletter: boolean;
  steuer: string;
  unlocked: boolean;
  blocked: boolean;
  /**relation id, use .expand property*/
  userData: string;
  created: Date;
  updated: Date;
  expand?: {
    libary: CollectionIdNameMap["pbc_2167360131"];
    userData: CollectionIdNameMap["pbc_3958537269"];
  };
}
interface books extends RecordModel {
  id: string;
  Titel: string;
  Autor: string;
  Warengruppe: string;
  Beschreibung: string;
  Anmerkung: string;
  ET: Date;
  Format: string;
  ISBN: string;
  /**relation id, use .expand property*/
  Schlagworte: string[];
  /**relation id, use .expand property*/
  Links: string[];
  Preis: number;
  Seiten: number;
  SerieBool: boolean;
  Serie: string;
  Waehrung: string;
  published: boolean;
  accepted: boolean;
  /**relation id, use .expand property*/
  Leseexemplar: string[];
  autoAccept: boolean;
  verlagId: string;
  edited: boolean;
  printVersion: string;
  paid: boolean;
  benachrichtigung: string;
  email: string;
  ZInfo: string;
  lateUpload: boolean;
  lateProbe: boolean;
  lastChecked: Date;
  Cover: string;
  LeseprobeFile: string;
  blocked: boolean;
  uid: string;
  qrCodeDownloads: number;
  qrCodeScans: number;
  VT: Date;
  leseprobeViews: number;
  leseexemplarDownloads: number;
  CoverFileName: string;
  LeseprobeFileName: string;
  LeseexemplarFileName: string;
  /**relation id, use .expand property*/
  benachrichtigungLeseexemplar: string[];
  /**relation id, use .expand property*/
  benachrichtigungLeseprobe: string[];
  created: Date;
  updated: Date;
  expand?: {
    Schlagworte: CollectionIdNameMap["pbc_1219621782"][];
    Links: CollectionIdNameMap["pbc_449060851"][];
    Leseexemplar: CollectionIdNameMap["pbc_3172247106"][];
  };
}
interface epubcfi extends RecordModel {
  id: string;
  /**relation id, use .expand property*/
  book: string;
  epubcfi: string;
  userId: string;
  created: Date;
  updated: Date;
}
interface leseexemplar extends RecordModel {
  id: string;
  userName: string;
  format: string;
  kommentar: string;
  accepted: boolean;
  edited: boolean;
  mailSend: boolean;
  sent: boolean;
  /**relation id, use .expand property*/
  userData: string;
  bookId: string;
  verlagId: string;
  userId: string;
  created: Date;
  updated: Date;
}
interface leseexemplarFile extends RecordModel {
  id: string;
  file: string;
  bookId: string;
  created: Date;
  updated: Date;
}
interface libary extends RecordModel {
  id: string;
  /**relation id, use .expand property*/
  Leseexemplare: string[];
  /**relation id, use .expand property*/
  books: string[];
  /**relation id, use .expand property*/
  favoriten: string[];
  /**relation id, use .expand property*/
  gelesen: string[];
  /**relation id, use .expand property*/
  Listen: string[];
  /**relation id, use .expand property*/
  Warengruppen: string[];
  /**relation id, use .expand property*/
  epubcfi: string[];
  created: Date;
  updated: Date;
  expand?: {
    Leseexemplare: CollectionIdNameMap["pbc_2170393721"][];
    books: CollectionIdNameMap["pbc_2170393721"][];
    favoriten: CollectionIdNameMap["pbc_2170393721"][];
    gelesen: CollectionIdNameMap["pbc_2170393721"][];
    Listen: CollectionIdNameMap["pbc_4114029235"][];
    Warengruppen: CollectionIdNameMap["pbc_2020289090"][];
    epubcfi: CollectionIdNameMap["pbc_869727876"][];
  };
}
interface links extends RecordModel {
  id: string;
  name: string;
  link: string;
  verlagId: string;
  created: Date;
  updated: Date;
}
interface listen extends RecordModel {
  id: string;
  title: string;
  /**relation id, use .expand property*/
  books: string[];
  userId: string;
  created: Date;
  updated: Date;
}
interface tags extends RecordModel {
  id: string;
  tag: string;
  /**relation id, use .expand property*/
  books: string[];
  created: Date;
  updated: Date;
}
interface userData extends RecordModel {
  id: string;
  userName: string;
  buchhaltung: string;
  kontakt: string;
  verlagId: string;
  verlagsname: string;
  buchhandlung: string;
  arbeit: string;
  verkehr: string;
  homepage: string;
  benachrichtigung: string;
  telefon: string;
  land: string;
  ort: string;
  plz: string;
  num: string;
  street: string;
  created: Date;
  updated: Date;
}
interface warengruppen extends RecordModel {
  id: string;
  title: string;
  /**relation id, use .expand property*/
  books: string[];
  userId: string;
  created: Date;
  updated: Date;
}
export interface pb_schema_map {
  _superusers: _superusers;
  users: users;
  _authOrigins: _authOrigins;
  _externalAuths: _externalAuths;
  _mfas: _mfas;
  _otps: _otps;
  books: books;
  epubcfi: epubcfi;
  leseexemplar: leseexemplar;
  leseexemplarFile: leseexemplarFile;
  libary: libary;
  links: links;
  listen: listen;
  tags: tags;
  userData: userData;
  warengruppen: warengruppen;
}
export interface TypedPocketBase extends PocketBaseImport {
  collection(idOrName: string): RecordService;
  collection(idOrName: "_superusers"): RecordService<_superusers>;
  collection(idOrName: "users"): RecordService<users>;
  collection(idOrName: "_authOrigins"): RecordService<_authOrigins>;
  collection(idOrName: "_externalAuths"): RecordService<_externalAuths>;
  collection(idOrName: "_mfas"): RecordService<_mfas>;
  collection(idOrName: "_otps"): RecordService<_otps>;
  collection(idOrName: "books"): RecordService<books>;
  collection(idOrName: "epubcfi"): RecordService<epubcfi>;
  collection(idOrName: "leseexemplar"): RecordService<leseexemplar>;
  collection(idOrName: "leseexemplarFile"): RecordService<leseexemplarFile>;
  collection(idOrName: "libary"): RecordService<libary>;
  collection(idOrName: "links"): RecordService<links>;
  collection(idOrName: "listen"): RecordService<listen>;
  collection(idOrName: "tags"): RecordService<tags>;
  collection(idOrName: "userData"): RecordService<userData>;
  collection(idOrName: "warengruppen"): RecordService<warengruppen>;
}
interface CollectionIdNameMap {
  pbc_3142635823: _superusers;
  _pb_users_auth_: users;
  pbc_4275539003: _authOrigins;
  pbc_2281828961: _externalAuths;
  pbc_2279338944: _mfas;
  pbc_1638494021: _otps;
  pbc_2170393721: books;
  pbc_869727876: epubcfi;
  pbc_3172247106: leseexemplar;
  pbc_1530605614: leseexemplarFile;
  pbc_2167360131: libary;
  pbc_449060851: links;
  pbc_4114029235: listen;
  pbc_1219621782: tags;
  pbc_3958537269: userData;
  pbc_2020289090: warengruppen;
}

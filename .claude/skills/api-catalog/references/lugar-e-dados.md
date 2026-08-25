# Lugar, transporte e dados públicos

Todas as APIs abaixo são **sem autenticação** — não precisam de chave.

Colunas: HTTPS = atende por HTTPS. CORS = pode ser chamada direto do navegador
(importante para Flutter Web; `unknown` significa que o catálogo não sabe).

## Geocoding

| API | O que faz | HTTPS | CORS |
|---|---|---|---|
| [administrative-divisons-db](https://github.com/kamikazechaser/administrative-divisions-db) | Get all administrative divisions of a country | Yes | Yes |
| [adresse.data.gouv.fr](https://adresse.data.gouv.fr) | Address database of France, geocoding and reverse | Yes | Unknown |
| [Airtel IP](https://sys.airtel.lv/ip2country/1.1.1.1/?full=true) | IP Geolocation API. Collecting data from multiple sources | Yes | Unknown |
| [BdAPIs](https://bdapis.com/) | Get divisions, districts, and upazzilas of Bangladesh | Yes | Unknown |
| [bng2latlong](https://www.getthedata.com/bng2latlong) | Convert British OSGB36 easting and northing (British National Grid) to WGS84 latitude and longitude | Yes | Yes |
| [Cartes.io](https://github.com/M-Media-Group/Cartes.io/wiki/API) | Create maps and markers for anything | Yes | Unknown |
| [Cep.la](http://cep.la/) | Brazil RESTful API to find information about streets, zip codes, neighborhoods, cities and states | No | Unknown |
| [CitySDK](http://www.citysdk.eu/citysdk-toolkit/) | Open APIs for select European cities | Yes | Unknown |
| [Country](http://country.is/) | Get your visitor's country from their IP | Yes | Yes |
| [Ducks Unlimited](https://gis.ducks.org/datasets/du-university-chapters/api) | API explorer that gives a query URL with a JSON response of locations and cities | Yes | No |
| [GeoApi](https://api.gouv.fr/api/geoapi.html) | French geographical data | Yes | Unknown |
| [Geocode.xyz](https://geocode.xyz/api) | Provides worldwide forward/reverse geocoding, batch geocoding and geoparsing | Yes | Unknown |
| [Geodata.gov.gr](https://geodata.gov.gr/en/) | Open geospatial data and API service for Greece | Yes | Unknown |
| [GeographQL](https://geographql.netlify.app) | A Country, State, and City GraphQL API | Yes | Yes |
| [GeoJS](https://www.geojs.io/) | IP geolocation with ChatOps integration | Yes | Yes |
| [Geokeo](https://geokeo.com) | Geokeo geocoding service- with 2500 free api requests daily | Yes | Yes |
| [GeoNames](http://www.geonames.org/export/web-services.html) | Place names and other geographical data | No | Unknown |
| [geoPlugin](https://www.geoplugin.com) | IP geolocation and currency conversion | Yes | Yes |
| [Graph Countries](https://github.com/lennertVanSever/graphcountries) | Country-related data like currencies, languages, flags, regions+subregions and bordering countries | Yes | Unknown |
| [HackMyIP](https://hackmyip.com/api) | IP geolocation, ISP and privacy/VPN scoring, email breach checks, DNS and WHOIS lookups | Yes | Yes |
| [HelloSalut](https://fourtonfish.com/project/hellosalut-api/) | Get hello translation following user language | Yes | Unknown |
| [Hong Kong GeoData Store](https://geodata.gov.hk/gs/) | API for accessing geo-data of Hong Kong | Yes | Unknown |
| [IBGE](https://servicodados.ibge.gov.br/api/docs/) | Aggregate services of IBGE (Brazilian Institute of Geography and Statistics) | Yes | Unknown |
| [IP 2 Country](https://ip2country.info) | Map an IP to a country | Yes | Unknown |
| [IP Address Details](https://ipinfo.io/) | Find geolocation with ip address | Yes | Unknown |
| [IP Vigilante](https://www.ipvigilante.com/) | Free IP Geolocation API | Yes | Unknown |
| [ip-api](https://ip-api.com/docs) | Find location with IP address or domain | No | Unknown |
| [ipapi.co](https://ipapi.co/api/#introduction) | Find IP address location information | Yes | Yes |
| [IPGEO](https://api.techniknews.net/ipgeo/) | Unlimited free IP Address API with useful information | Yes | Unknown |
| [ipwhois](https://ipwhois.io/documentation) | IP geolocation with country, city, coordinates, ISP, timezone and flag data | Yes | Yes |
| [LatLng](https://www.latlng.work/docs) | Geocoding, reverse geocoding, places, and static maps | Yes | Yes |
| [Mexico](https://github.com/IcaliaLabs/sepomex) | Mexico RESTful zip codes API | Yes | Unknown |
| [Nominatim](https://nominatim.org/release-docs/latest/api/Overview/) | Provides worldwide forward / reverse geocoding | Yes | Yes |
| [OnWater](https://onwater.io/) | Determine if a lat/lon is on water or land | Yes | Unknown |
| [Open Topo Data](https://www.opentopodata.org) | Elevation and ocean depth for a latitude and longitude | Yes | No |
| [Pinball Map](https://pinballmap.com/api/v1/docs) | A crowdsourced map of public pinball machines | Yes | Yes |
| [PostalCodes](https://postalcodes.info/api) | Postal code search, country exports, and address validation data | Yes | Unknown |
| [Postali](https://postali.app/api) | Mexico Zip Codes API | Yes | Yes |
| [PostcodeData.nl](http://api.postcodedata.nl/v1/postcode/?postcode=1211EP&streetnumber=60&ref=domeinnaam.nl&type=json) | Provide geolocation data based on postcode for Dutch addresses | No | Unknown |
| [Postcodes.io](https://postcodes.io) | Postcode lookup & Geolocation for the UK | Yes | Yes |
| [Queimadas INPE](https://queimadas.dgi.inpe.br/queimadas/dados-abertos/) | Access to heat focus data (probable wildfire) | Yes | Unknown |
| [REST Countries](https://restcountries.com) | Get information about countries via a RESTful API | Yes | Yes |
| [Rwanda Locations](https://rapidapi.com/victorkarangwa4/api/rwanda) | Rwanda Provences, Districts, Cities, Capital City, Sector, cells, villages and streets | Yes | Unknown |
| [SLF](https://github.com/slftool/slftool.github.io/blob/master/API.md) | German city, country, river, database | Yes | Yes |
| [ViaCep](https://viacep.com.br) | Brazil RESTful zip codes API | Yes | Unknown |
| [Zippopotam.us](http://www.zippopotam.us) | Get information about place such as country, city, state, etc | No | Unknown |
| [Ziptastic](https://ziptasticapi.com/) | Get the country, state, and city of any US zip-code | Yes | Unknown |

## Transportation

| API | O que faz | HTTPS | CORS |
|---|---|---|---|
| [ADS-B Exchange](https://www.adsbexchange.com/data/) | Access real-time and historical data of any and all airborne aircraft | Yes | Unknown |
| [airportsapi](https://airport-web.appspot.com/api/docs/) | Get name and website-URL for airports by ICAO code | Yes | Unknown |
| [Apimetro](https://apimetro.dev/swagger/index.html) | Geospatial data for Mexico City public transport system (Metro, Metrobús, Cablebús, RTP, etc.) | Yes | Yes |
| [AviationAPI](https://docs.aviationapi.com) | FAA Aeronautical Charts and Publications, Airport Information, and Airport Weather | Yes | No |
| [BC Ferries](https://www.bcferriesapi.ca) | Sailing times and capacities for BC Ferries | Yes | Yes |
| [Can I enter](https://canienter.com) | Visa and entry requirements for 199 passports, cited to official sources, verified daily | Yes | Yes |
| [Community Transit](https://github.com/transitland/transitland-datastore/blob/master/README.md#api-endpoints) | Transitland API | Yes | Unknown |
| [FAA N-Number Registry](https://n-number.starfile.org/api) | Every FAA-registered civil aircraft in the United States, lookup by N-number or Mode S hex code | Yes | Yes |
| [Icelandic APIs](http://docs.apis.is/) | Open APIs that deliver services in or regarding Iceland | Yes | Unknown |
| [Metro Lisboa](http://app.metrolisboa.pt/status/getLinhas.php) | Delays in subway lines | No | No |
| [OpenSky Network](https://opensky-network.org/apidoc/index.html) | Free real-time ADS-B aviation data | Yes | Unknown |
| [OpenVan](https://openvan.camp/docs) | Fuel prices for 121 countries, food cost index & vanlife weather scores for RV travel | Yes | Yes |
| [REFUGE Restrooms](https://www.refugerestrooms.org/api/docs/#!/restrooms) | Provides safe restroom access for transgender, intersex and gender nonconforming individuals | Yes | Unknown |
| [Strait of Hormuz Ship Monitor](https://hormuz.data-tracking.net/llms.txt) | Live AIS vessel traffic, crossings and oil flow through the Strait of Hormuz | Yes | No |
| [TransitLand](https://www.transit.land/documentation/datastore/api-endpoints.html) | Transit Aggregation | Yes | Unknown |
| [Transport for Atlanta, US](http://www.itsmarta.com/app-developer-resources.aspx) | Marta | No | Unknown |
| [Transport for Auckland, New Zealand](https://dev-portal.at.govt.nz/) | Auckland Transport | Yes | Unknown |
| [Transport for Belgium](https://docs.irail.be/) | The iRail API is a third-party API for Belgian public transport by train | Yes | Yes |
| [Transport for Berlin, Germany](https://github.com/derhuerst/vbb-rest/blob/3/docs/index.md) | Third-party VBB API | Yes | Unknown |
| [Transport for Budapest, Hungary](https://bkkfutar.docs.apiary.io) | Budapest public transport API | Yes | Unknown |
| [Transport for Czech Republic](https://www.chaps.cz/eng/products/idos-internet) | Czech transport API | Yes | Unknown |
| [Transport for Denver, US](http://www.rtd-denver.com/gtfs-developer-guide.shtml) | RTD | No | Unknown |
| [Transport for Finland](https://digitransit.fi/en/developers/ ) | Finnish transport API | Yes | Unknown |
| [Transport for Grenoble, France](https://www.mobilites-m.fr/pages/opendata/OpenDataApi.html) | Grenoble public transport | No | No |
| [Transport for Hessen, Germany](https://opendata.rmv.de/site/start.html) | RMV API (Public Transport in Hessen) | Yes | Unknown |
| [Transport for Los Angeles, US](https://developer.metro.net/api/) | Data about positions of Metro vehicles in real time and travel their routes | Yes | Unknown |
| [Transport for Norway](https://developer.entur.org/) | Transport APIs and dataset for Norway | Yes | Unknown |
| [Transport for Paris, France](http://data.ratp.fr/api/v1/console/datasets/1.0/search/) | RATP Open Data API | No | Unknown |
| [Transport for Philadelphia, US](http://www3.septa.org/hackathon/) | SEPTA APIs | No | Unknown |
| [Transport for Spain](https://data.renfe.com/api/1/util/snippet/api_info.html?resource_id=a2368cff-1562-4dde-8466-9635ea3a572a) | Public trains of Spain | Yes | Unknown |
| [Transport for Switzerland](https://transport.opendata.ch/) | Swiss public transport API | Yes | Unknown |
| [Transport for The Netherlands](https://github.com/skywave/KV78Turbo-OVAPI/wiki) | OVAPI, country-wide public transport | Yes | Unknown |
| [Transport for Toronto, Canada](https://myttc.ca/developers) | TTC | Yes | Unknown |
| [Transport for United States](https://retro.umoiq.com/xmlFeedDocs/NextBusXMLFeed.pdf) | NextBus API | No | Unknown |
| [transport.rest](https://transport.rest) | Community maintained, developer-friendly public transport API | Yes | Yes |
| [Velib metropolis, Paris, France](https://www.velib-metropole.fr/donnees-open-data-gbfs-du-service-velib-metropole) | Velib Open Data API | Yes | No |

## Weather

| API | O que faz | HTTPS | CORS |
|---|---|---|---|
| [7Timer!](http://www.7timer.info/doc.php?lang=en) | Weather, especially for Astroweather | No | Unknown |
| [AviationWeather](https://www.aviationweather.gov/dataserver) | NOAA aviation weather forecasts and observations | Yes | Unknown |
| [Hail History](https://hail-history-noaa.netlify.app/api-docs.html) | Radar-detected hail history for any US address from NOAA NEXRAD Level-III hail detections, by year | Yes | Yes |
| [Hong Kong Obervatory](https://www.hko.gov.hk/en/abouthko/opendata_intro.htm) | Provide weather information, earthquake information, and climate data | Yes | Unknown |
| [IPMA](https://api.ipma.pt/open-data/) | Portuguese weather and climate data | Yes | Unknown |
| [Meltema](https://meltema.com/docs) | Multi-model weather: GFS, ECMWF AIFS/IFS and a 31-member GEFS ensemble, keyless point forecasts | Yes | No |
| [ODWeather](http://api.oceandrivers.com/static/docs.html) | Weather and weather webcams | No | Unknown |
| [Open-Meteo](https://open-meteo.com/) | Global weather forecast API for non-commercial use | Yes | Yes |
| [openSenseMap](https://api.opensensemap.org/) | Data from Personal Weather Stations called senseBoxes | Yes | Yes |
| [Pirate Weather](https://pirateweather.net/en/latest/) | Free weather API with forecast data similar to Dark Sky | Yes | Yes |
| [RainViewer](https://www.rainviewer.com/api.html) | Radar data collected from different websites across the Internet | Yes | Unknown |
| [US Weather](https://www.weather.gov/documentation/services-web-api) | US National Weather Service | Yes | Yes |
| [weather-api](https://github.com/robertoduessmann/weather-api) | A RESTful free API to check the weather | Yes | No |
| [World Time & Weather](https://worldtimeweather.com/api.html) | Current weather, local time, UTC offset and DST rules for 400 cities as static JSON | Yes | Yes |
| [wttr.in](https://wttr.in/:help) | Weather in your terminal, supports JSON output | Yes | Yes |

## Environment

| API | O que faz | HTTPS | CORS |
|---|---|---|---|
| [CO2 Offset](https://co2offset.io/api.html) | API calculates and validates the carbon footprint | Yes | Unknown |
| [Danish data service Energi](https://www.energidataservice.dk/) | Open energy data from Energinet to society | Yes | Unknown |
| [GrünstromIndex](https://gruenstromindex.de/) | Green Power Index for Germany (Grünstromindex/GSI) | No | Yes |
| [kanari](https://kanari.io/en/api) | Real-time worldwide wildfire detections, water bomber tracking and open fire archive | Yes | Yes |
| [Luchtmeetnet](https://api-docs.luchtmeetnet.nl/) | Predicted and actual air quality components for The Netherlands (RIVM) | Yes | Unknown |
| [National Grid ESO](https://data.nationalgrideso.com/) | Open data from Great Britain’s Electricity System Operator | Yes | Unknown |
| [PM2.5 Open Data Portal](https://pm25.lass-net.org/#apis) | Open low-cost PM2.5 sensor data | Yes | Unknown |
| [Solematica](https://www.solematica.it/sviluppatori) | Compare Italian solar (photovoltaic) installer offers, energy prices (PUN/ARERA) and satellite roof data | Yes | No |
| [UK Carbon Intensity](https://carbon-intensity.github.io/api-definitions/#carbon-intensity-api-v1-0-0) | The Official Carbon Intensity API for Great Britain developed by National Grid | Yes | Unknown |
| [Website Carbon](https://api.websitecarbon.com/) | API to estimate the carbon footprint of loading web pages | Yes | Unknown |

## Open Data

| API | O que faz | HTTPS | CORS |
|---|---|---|---|
| [18F](http://18f.github.io/API-All-the-X/) | Unofficial US Federal Government API Development | No | Unknown |
| [API Setu](https://www.apisetu.gov.in/) | An Indian Government platform that provides a lot of APIS for KYC, business, education & employment | Yes | Yes |
| [Archive.org](https://archive.readme.io/docs) | The Internet Archive | Yes | No |
| [BotsArchive](https://botsarchive.com/docs.html) | JSON formatted details about Telegram Bots available in database | Yes | Unknown |
| [Callook.info](https://callook.info) | United States ham radio callsigns | Yes | Unknown |
| [CollegeScoreCard.ed.gov](https://collegescorecard.ed.gov/data/) | Data on higher education institutions in the United States | Yes | Unknown |
| [CuttingToolsAI](https://cuttingtoolsai.eu/api) | Cross-brand carbide insert grade equivalents by ISO application class | Yes | Yes |
| [EOSL](https://eosl.ai/api/) | Hardware end-of-sale and end-of-service-life dates by part number, source-linked | Yes | Yes |
| [French Address Search](https://geo.api.gouv.fr/adresse) | Address search via the French Government | Yes | Unknown |
| [i6eal Open AI Data](https://i6eal.de/en/tools/data/) | Open datasets on AI policy, regulation and public-sector adoption in Germany and the EU | Yes | Yes |
| [LottoLens PH](https://remo65588-boop.github.io/lottolens-ph-public-data/api/) | Fixed Philippine PCSO historical results and normal draw schedules | Yes | Yes |
| [Lowy Asia Power Index](https://github.com/0x0is1/lowy-index-api-docs) | Get measure resources and influence to rank the relative power of states in Asia | Yes | Unknown |
| [Microlink.io](https://microlink.io) | Extract structured data from any website | Yes | Yes |
| [ModelPartFinder Error Codes](https://modelpartfinder.com/docs/api) | Lookup appliance and equipment error codes by brand and code, with recommended replacement parts | Yes | Yes |
| [MostExpensiveWatches](https://mostexpensivewatches.net/api) | Documented luxury watch auction records, live listings, valuations and price indices | Yes | Yes |
| [Nobel Prize](https://www.nobelprize.org/about/developer-zone-2/) | Open data about nobel prizes and events | Yes | Yes |
| [Onyx Bazaar](https://onyx-actions.onrender.com/bazaar) | Free public leaderboard of x402 paid HTTP services indexed from Coinbase CDP discovery API | Yes | Unknown |
| [Open Data Minneapolis](https://opendata.minneapolismn.gov/) | Spatial (GIS) and non-spatial city data for Minneapolis | Yes | No |
| [Open Scholarships](https://scholarships.grudged.io) | Free, openly-licensed directory of US scholarships and student aid from official sources | Yes | Yes |
| [openAFRICA](https://africaopendata.org/) | Large datasets repository of African open data | Yes | Unknown |
| [OpenSanctions](https://www.opensanctions.org/docs/api/) | Data on international sanctions, crime and politically exposed persons | Yes | Yes |
| [Statistics of the World](https://statisticsoftheworld.com/api-docs) | Economic data for 218 countries — GDP, population, inflation, and 440+ indicators from IMF and World Bank | Yes | Yes |
| [Teleport](https://developers.teleport.org/) | Quality of Life Data | Yes | Unknown |
| [Tilth](https://www.tilth.uk/data) | Free daily UK fertiliser price index across nine grades, CC BY 4.0 licensed | Yes | Yes |
| [Umeå Open Data](https://opendata.umea.se/api/) | Open data of the city Umeå in northen Sweden | Yes | Yes |
| [Universities List](https://github.com/Hipo/university-domains-list) | University names, countries and domains | Yes | Unknown |
| [University of Oslo](https://data.uio.no/) | Courses, lecture videos, detailed information for courses etc. for the University of Oslo (Norway) | Yes | Unknown |
| [Urban Observatory](https://urbanobservatory.ac.uk) | The largest set of publicly available real time urban data in the UK | No | No |
| [Voidly](https://voidly.ai/api-docs) | Internet censorship measurements, incidents, and ISP-level blocking data across 126 countries | Yes | No |
| [Warnely](https://warnely.com/developers) | Composite travel-safety scores for 180 countries (FCDO + US State + GPI + WGI + live incident wire), OpenAPI 3.1 spec, CC BY 4.0 | Yes | Yes |
| [Wikipedia](https://www.mediawiki.org/wiki/API:Main_page) | Mediawiki Encyclopedia | Yes | Unknown |

## Government

| API | O que faz | HTTPS | CORS |
|---|---|---|---|
| [Bank Negara Malaysia Open Data](https://apikijangportal.bnm.gov.my/) | Malaysia Central Bank Open Data | Yes | Unknown |
| [BCLaws](https://www.bclaws.gov.bc.ca/civix/template/complete/api/index.html) | Access to the laws of British Columbia | No | Unknown |
| [Brazil Central Bank Open Data](https://dadosabertos.bcb.gov.br/) | Brazil Central Bank Open Data | Yes | Unknown |
| [Brazil Receita WS](https://www.receitaws.com.br/) | Consult companies by CNPJ for Brazilian companies | Yes | Unknown |
| [Brazil](https://brasilapi.com.br/) | Community driven API for Brazil Public Data | Yes | Yes |
| [Brazilian Chamber of Deputies Open Data](https://dadosabertos.camara.leg.br/swagger/api.html) | Provides legislative information in Apis XML and JSON, as well as files in various formats | Yes | No |
| [Census.gov](https://www.census.gov/data/developers/data-sets.html) | The US Census Bureau provides various APIs and data sets on demographics and businesses | Yes | Unknown |
| [City, Berlin](https://daten.berlin.de/) | Berlin(DE) City Open Data | Yes | Unknown |
| [City, Gdańsk](https://ckan.multimediagdansk.pl/en) | Gdańsk (PL) City Open Data | Yes | Unknown |
| [City, Gdynia](http://otwartedane.gdynia.pl/en/api_doc.html) | Gdynia (PL) City Open Data | No | Unknown |
| [City, Helsinki](https://hri.fi/en_gb/) | Helsinki(FI) City Open Data | Yes | Unknown |
| [City, Lviv](https://opendata.city-adm.lviv.ua/) | Lviv(UA) City Open Data | Yes | Unknown |
| [City, New York Open Data](https://opendata.cityofnewyork.us/) | New York (US) City Open Data | Yes | Unknown |
| [City, Prague Open Data](http://opendata.praha.eu/en) | Prague(CZ) City Open Data | No | Unknown |
| [City, Toronto Open Data](https://open.toronto.ca/) | Toronto (CA) City Open Data | Yes | Yes |
| [Colorado Information Marketplace](https://data.colorado.gov/) | Colorado State Government Open Data | Yes | Unknown |
| [Data USA](https://datausa.io/about/api/) | US Public Data | Yes | Unknown |
| [Data.parliament.uk](https://explore.data.parliament.uk/?learnmore=Members) | Contains live datasets including information about petitions, bills, MP votes, attendance and more | No | Unknown |
| [District of Columbia Open Data](http://opendata.dc.gov/pages/using-apis) | Contains D.C. government public datasets, including crime, GIS, financial data, and so on | Yes | Unknown |
| [EPA](https://www.epa.gov/developers/data-data-products#apis) | Web services and data sets from the US Environmental Protection Agency | Yes | Unknown |
| [FBI Wanted](https://www.fbi.gov/wanted/api) | Access information on the FBI Wanted program | Yes | Unknown |
| [Federal Register](https://www.federalregister.gov/reader-aids/developer-resources/rest-api) | The Daily Journal of the United States Government | Yes | Unknown |
| [Food Standards Agency](http://ratings.food.gov.uk/open-data/en-GB) | UK food hygiene rating data API | No | Unknown |
| [Indian Mandi Prices](https://mandi-api.vercel.app/docs) | Free, keyless daily wholesale mandi prices for 5 Indian states, sourced from data.gov.in | Yes | Yes |
| [Indian Pincode](https://indianpincode.com/) | Free India PIN code lookup with GPS coordinates, 165k+ post offices, state & district data | Yes | Yes |
| [INEI](http://iinei.inei.gob.pe/microdatos/) | Peruvian Statistical Government Open Data | No | Unknown |
| [Interpol Red Notices](https://interpol.api.bund.dev/) | Access and search Interpol Red Notices | Yes | Unknown |
| [Istanbul (İBB) Open Data](https://data.ibb.gov.tr) | Data sets from the İstanbul Metropolitan Municipality (İBB) | Yes | Unknown |
| [LocalGov.jp](https://localgov.jp/) | Japan grants and subsidies (central J-Grants + 1,916 municipalities) | Yes | Yes |
| [Neotimo DGFiP Mirror](https://neotimo.com/annuaire-dgfip) | French DGFiP registry of certified e-invoicing platforms (Plateformes Agréées), searchable by SIRET | Yes | Unknown |
| [Open Government, ACT](https://www.data.act.gov.au/) | Australian Capital Territory Open Data | Yes | Unknown |
| [Open Government, Argentina](https://datos.gob.ar/) | Argentina Government Open Data | Yes | Unknown |
| [Open Government, Australia](https://www.data.gov.au/) | Australian Government Open Data | Yes | Unknown |
| [Open Government, Austria](https://www.data.gv.at/) | Austria Government Open Data | Yes | Unknown |
| [Open Government, Belgium](https://data.gov.be/) | Belgium Government Open Data | Yes | Unknown |
| [Open Government, Canada](http://open.canada.ca/en) | Canadian Government Open Data | No | Unknown |
| [Open Government, Colombia](https://www.dane.gov.co/) | Colombia Government Open Data | No | Unknown |
| [Open Government, Cyprus](https://data.gov.cy/?language=en) | Cyprus Government Open Data | Yes | Unknown |
| [Open Government, Czech Republic](https://data.gov.cz/english/) | Czech Republic Government Open Data | Yes | Unknown |
| [Open Government, Denmark](https://www.opendata.dk/) | Denmark Government Open Data | Yes | Unknown |
| [Open Government, Finland](https://www.avoindata.fi/en) | Finland Government Open Data | Yes | Unknown |
| [Open Government, Germany](https://www.govdata.de/daten/-/details/govdata-metadatenkatalog) | Germany Government Open Data | Yes | Unknown |
| [Open Government, Indonesia](https://data.go.id/) | Indonesian Government Open Data | Yes | Unknown |
| [Open Government, Ireland](https://data.gov.ie/pages/developers) | Ireland Government Open Data | Yes | Unknown |
| [Open Government, Italy](https://www.dati.gov.it/) | Italy Government Open Data | Yes | Unknown |
| [Open Government, Lithuania](https://data.gov.lt/public/api/1) | Lithuania Government Open Data | Yes | Unknown |
| [Open Government, Mexico](https://datos.gob.mx/) | Mexico Government Open Data | Yes | Unknown |
| [Open Government, Mexico](https://www.inegi.org.mx/datos/) | Mexican Statistical Government Open Data | Yes | Unknown |
| [Open Government, Netherlands](https://data.overheid.nl/en/ondersteuning/data-publiceren/api) | Netherlands Government Open Data | Yes | Unknown |
| [Open Government, New Zealand](https://www.data.govt.nz/) | New Zealand Government Open Data | Yes | Unknown |
| [Open Government, Norway](https://data.norge.no/dataservices) | Norwegian Government Open Data | Yes | Yes |
| [Open Government, Peru](https://www.datosabiertos.gob.pe/) | Peru Government Open Data | Yes | Unknown |
| [Open Government, Poland](https://dane.gov.pl/en) | Poland Government Open Data | Yes | Yes |
| [Open Government, Portugal](https://dados.gov.pt/en/docapi/) | Portugal Government Open Data | Yes | Yes |
| [Open Government, Queensland Government](https://www.data.qld.gov.au/) | Queensland Government Open Data | Yes | Unknown |
| [Open Government, Romania](http://data.gov.ro/) | Romania Government Open Data | No | Unknown |
| [Open Government, Saudi Arabia](https://data.gov.sa) | Saudi Arabia Government Open Data | Yes | Unknown |
| [Open Government, Singapore](https://data.gov.sg/developer) | Singapore Government Open Data | Yes | Unknown |
| [Open Government, Slovakia](https://data.gov.sk/en/) | Slovakia Government Open Data | Yes | Unknown |
| [Open Government, Slovenia](https://podatki.gov.si/) | Slovenia Government Open Data | Yes | No |
| [Open Government, South Australian Government](https://data.sa.gov.au/) | South Australian Government Open Data | Yes | Unknown |
| [Open Government, Spain](https://datos.gob.es/en) | Spain Government Open Data | Yes | Unknown |
| [Open Government, Sweden](https://www.dataportal.se/en/dataservice/91_29789/api-for-the-statistical-database) | Sweden Government Open Data | Yes | Unknown |
| [Open Government, Switzerland](https://handbook.opendata.swiss/de/content/nutzen/api-nutzen.html) | Switzerland Government Open Data | Yes | Unknown |
| [Open Government, Taiwan](https://data.gov.tw/) | Taiwan Government Open Data | Yes | Unknown |
| [Open Government, UK](https://data.gov.uk/) | UK Government Open Data | Yes | Unknown |
| [Open Government, USA](https://www.data.gov/) | United States Government Open Data | Yes | Unknown |
| [Open Government, Victoria State Government](https://www.data.vic.gov.au/) | Victoria State Government Open Data | Yes | Unknown |
| [Open Government, West Australia](https://data.wa.gov.au/) | West Australia Open Data | Yes | Unknown |
| [OpenMercantil](https://openmercantil.es/api/documentacion) | Spanish company public data and BORME event timelines | Yes | Yes |
| [PRC Exam Schedule](https://api.whenisthenextboardexam.com/docs/) | Unofficial Philippine Professional Regulation Commission's examination schedule | Yes | Yes |
| [Represent by Open North](https://represent.opennorth.ca/) | Find Canadian Government Representatives | Yes | Unknown |
| [Tollmint](https://api.tollmint.com) | Advertising, subscription, AI-disclosure and accessibility rules across the US, EU and UK | Yes | Yes |
| [US Federal Contracts & Grants](https://government-data-api.onrender.com/docs) | US federal contracts, grants, and agency spending data updated daily | Yes | Yes |
| [US Presidential Election Data by TogaTech](https://uselection.togatech.org/api/) | Basic candidate data and live electoral vote counts for top two parties in US presidential election | Yes | No |
| [USAspending.gov](https://api.usaspending.gov/) | US federal spending data | Yes | Unknown |
| [Vett](https://wimberly.solutions/api/free-sanctions-check/) | Screen names & companies against OFAC, PEP, watchlists & recalls | Yes | Yes |

## Vehicle

| API | O que faz | HTTPS | CORS |
|---|---|---|---|
| [Auto Body Shop Directory](https://autobodyshopnear.com/developers/body-shop-api) | Find auto body shops by ZIP code, city, location, or profile | Yes | No |
| [Brazilian Vehicles and Prices](https://deividfortuna.github.io/fipe/) | Vehicles information from Fundação Instituto de Pesquisas Econômicas - Fipe | Yes | No |
| [NHTSA](https://vpic.nhtsa.dot.gov/api/) | NHTSA Product Information Catalog and Vehicle Listing | Yes | Unknown |
| [ProblemsByVin](https://problemsbyvin.com/data/) | Owner complaints, recalls and failure-mileage statistics by vehicle make, model and year | Yes | Yes |

---

220 APIs neste arquivo. Fonte: [public-apis/public-apis](https://github.com/public-apis/public-apis) (MIT).

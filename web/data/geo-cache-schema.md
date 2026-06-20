# GeoIP Cache JSON Schema

## Overview

This document defines the schema for `geo-cache.json` — the local cache file maintained by the GeoIP lookup script (`f2b-geoip.sh`). It stores geolocation data for IP addresses to avoid redundant API calls.

## File Location

```
web/data/geo-cache.json
```

## Top-Level Structure

```json
{
  "165.227.124.92": { ... },
  "141.11.250.227": { ... },
  ...
}
```

## Record Structure

Each key is an IP address, and each value is a geo location object.

| Field | Type | Description |
|-------|------|-------------|
| `ip` | string | IP address (matches the key) |
| `country` | string | Country name (e.g., "United States") |
| `countryCode` | string | ISO 3166-1 alpha-2 country code (e.g., "US") |
| `regionName` | string | Region/state name (e.g., "California") |
| `city` | string | City name (e.g., "San Francisco") |
| `lat` | number | Latitude (e.g., 37.7749) |
| `lon` | number | Longitude (e.g., -122.4194) |
| `isp` | string | Internet service provider name |
| `org` | string | Organization name |
| `as` | string | Autonomous system number |
| `timestamp` | string (ISO 8601) | When this entry was cached |
| `status` | string | "success" or "fail" |

## Special IP Handling

### Private IP Addresses

Private IPs are skipped from API lookup and stored with special values:

```json
{
  "192.168.1.100": {
    "ip": "192.168.1.100",
    "country": "Internal/Private",
    "countryCode": null,
    "regionName": null,
    "city": null,
    "lat": null,
    "lon": null,
    "isp": null,
    "org": null,
    "as": null,
    "timestamp": "2026-06-19T08:30:00Z",
    "status": "private"
  }
}
```

**Private IP Ranges:**
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`
- `127.0.0.0/8`
- `169.254.0.0/16`

### IPv6 Addresses

IPv6 addresses are skipped from API lookup:

```json
{
  "2a03:6f00:4::1fec": {
    "ip": "2a03:6f00:4::1fec",
    "country": "IPv6",
    "countryCode": null,
    "regionName": null,
    "city": null,
    "lat": null,
    "lon": null,
    "isp": null,
    "org": null,
    "as": null,
    "timestamp": "2026-06-19T08:30:00Z",
    "status": "ipv6"
  }
}
```

### Lookup Failures

Failed lookups are cached with status "fail" to prevent repeated API calls:

```json
{
  "0.0.0.0": {
    "ip": "0.0.0.0",
    "country": "Unknown",
    "countryCode": null,
    "regionName": null,
    "city": null,
    "lat": null,
    "lon": null,
    "isp": null,
    "org": null,
    "as": null,
    "timestamp": "2026-06-19T08:30:00Z",
    "status": "fail"
  }
}
```

## IP-API Response Mapping

The geo-cache stores data from IP-API responses. Field mapping:

| IP-API Field | geo-cache Field |
|--------------|-----------------|
| `query` | `ip` |
| `country` | `country` |
| `countryCode` | `countryCode` |
| `regionName` | `regionName` |
| `city` | `city` |
| `lat` | `lat` |
| `lon` | `lon` |
| `isp` | `isp` |
| `org` | `org` |
| `as` | `as` |
| — | `timestamp` (generated at write time) |
| `status` | `status` ("success" or "fail") |

## Cache Maintenance

1. **Atomic Writes**: Script writes to `.tmp` file, then `mv` to prevent corruption
2. **No Expiry**: Cache entries persist indefinitely
3. **Rate Limiting**: 1.4 second delay between API calls (45 req/min limit)
4. **Batch Prevention**: Free tier doesn't support batch — individual lookups only

## Example: Full geo-cache.json

```json
{
  "165.227.124.92": {
    "ip": "165.227.124.92",
    "country": "United States",
    "countryCode": "US",
    "regionName": "New Jersey",
    "city": "North Bergen",
    "lat": 40.793,
    "lon": -74.0245,
    "isp": "DigitalOcean, LLC",
    "org": "DigitalOcean",
    "as": "AS14061 DigitalOcean, LLC",
    "timestamp": "2026-06-19T08:30:00Z",
    "status": "success"
  },
  "192.168.1.50": {
    "ip": "192.168.1.50",
    "country": "Internal/Private",
    "countryCode": null,
    "regionName": null,
    "city": null,
    "lat": null,
    "lon": null,
    "isp": null,
    "org": null,
    "as": null,
    "timestamp": "2026-06-19T08:30:00Z",
    "status": "private"
  }
}
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-19 | Initial schema definition |
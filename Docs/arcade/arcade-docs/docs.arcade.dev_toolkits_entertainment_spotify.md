---
url: "https://docs.arcade.dev/toolkits/entertainment/spotify"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") EntertainmentSpotify

# Spotify

**Description:** Enable agents to interact with Spotify tracks.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/spotify)

**Auth:** User authorizationvia the [Spotify auth provider](https://docs.arcade.dev/home/auth-providers/spotify)

This Toolkit is not available in Arcade Cloud. You can use these tools with a [self-hosted](https://docs.arcade.dev/home/install/overview) instance of Arcade.

[![PyPI Version](https://img.shields.io/pypi/v/arcade_spotify)](https://pypi.org/project/arcade_spotify/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_spotify)](https://pypi.org/project/arcade_spotify/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_spotify)](https://pypi.org/project/arcade_spotify/)[![Downloads](https://img.shields.io/pypi/dm/arcade_spotify)](https://pypi.org/project/arcade_spotify/)

The Arcade Spotify toolkit provides a pre-built set of tools for interacting with Spotify. These tools make it easy to build agents and AI apps that can:

- Get information about tracks
- Search for tracks
- Control playback

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#available-tools)

These tools are currently available in the Arcade Spotify toolkit.

| Tool Name | Description |
| --- | --- |
| GetTrackFromId | Get information about a track |
| AdjustPlaybackPosition | Adjust the playback position within the currently playing track. Note: This tool currently requires a self-hosted instance of Arcade. |
| SkipToPreviousTrack | Skip to the previous track in the user's queue, if any. Note: This tool currently requires a self-hosted instance of Arcade. |
| SkipToNextTrack | Skip to the next track in the user's queue, if any. Note: This tool currently requires a self-hosted instance of Arcade. |
| PausePlayback | Pause the currently playing track, if any. Note: This tool currently requires a self-hosted instance of Arcade. |
| ResumePlayback | Resume the currently playing track, if any. Note: This tool currently requires a self-hosted instance of Arcade. |
| StartTracksPlaybackById | Start playback of a list of tracks (songs). Note: This tool currently requires a self-hosted instance of Arcade. |
| GetPlaybackState | Get information about the user's current playback state, including track or episode, and active device. Note: This tool currently requires a self-hosted instance of Arcade. |
| GetCurrentlyPlaying | Get information about the user's currently playing track. Note: This tool currently requires a self-hosted instance of Arcade. |
| PlayArtistByName | Plays a song by an artist and queues four more songs by the same artist. Note: This tool currently requires a self-hosted instance of Arcade. |
| PlayTrackByName | Plays a song by name. Note: This tool currently requires a self-hosted instance of Arcade. |
| GetAvailableDevices | Get the available devices. Note: This tool currently requires a self-hosted instance of Arcade. |
| Search | Search Spotify catalog information. Note: This tool currently requires a self-hosted instance of Arcade. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Spotify auth\\
provider](https://docs.arcade.dev/home/auth-providers/spotify#using-spotify-auth-in-customtools).

## GetTrackFromId [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#gettrackfromid)

See Example >

Get information about a track

**Parameters**

- `track_id` _(string, required)_ The Spotify ID of the track

* * *

## AdjustPlaybackPosition [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#adjustplaybackposition)

See Example >

Adjust the playback position within the currently playing track.

Knowledge of the current playback state is NOT needed to use this tool as it handles clamping the position to valid start/end boundaries to prevent overshooting or negative values.

This tool allows you to seek to a specific position within the currently playing track. You can either provide an absolute position in milliseconds or a relative position from the current playback position in milliseconds.

Note: Either absolute\_position\_ms or relative\_position\_ms must be provided, but not both.

**Parameters**

- `absolute_position_ms` _(integer, optional)_ The absolute position in milliseconds to seek to

- `relative_position_ms` _(integer, optional)_ The relative position from the current playback position in milliseconds to seek to


* * *

## SkipToPreviousTrack [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#skiptoprevioustrack)

See Example >

Skip to the previous track in the user’s queue, if any

* * *

## SkipToNextTrack [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#skiptonexttrack)

See Example >

Skip to the next track in the user’s queue, if any

* * *

## PausePlayback [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#pauseplayback)

See Example >

Pause the currently playing track, if any

* * *

## ResumePlayback [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#resumeplayback)

See Example >

Resume the currently playing track, if any

* * *

## StartTracksPlaybackById [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#starttracksplaybackbyid)

See Example >

Start playback of a list of tracks (songs)

**Parameters**

- `track_ids` _(array, required)_ A list of Spotify track (song) IDs to play. Order of execution is not guarenteed.

- `position_ms` _(integer, optional)_ The position in milliseconds to start the first track from


* * *

## GetPlaybackState [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#getplaybackstate)

See Example >

Get information about the user’s current playback state, including track or episode, and active device. This tool does not perform any actions. Use other tools to control playback.

* * *

## GetCurrentlyPlaying [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#getcurrentlyplaying)

See Example >

Get information about the user’s currently playing track

* * *

## PlayArtistByName [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#playartistbyname)

See Example >

Plays a song by an artist and queues four more songs by the same artist

**Parameters**

- `name` _(string, required)_ The name of the artist to play

* * *

## PlayTrackByName [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#playtrackbyname)

See Example >

Plays a song by name

**Parameters**

- `track_name` _(string, required)_ The name of the track to play

- `artist_name` _(string, optional)_ The name of the artist of the track


## GetAvailableDevices [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#getavailabledevices)

See Example >

Get the available devices

* * *

## Search [Permalink for this section](https://docs.arcade.dev/toolkits/entertainment/spotify\#search)

See Example >

Search Spotify catalog information

Explanation of the q parameter: You can narrow down your search using field filters. The available filters are album, artist, track, year, upc, tag:hipster, tag:new, isrc, and genre. Each field filter only applies to certain result types.

The artist and year filters can be used while searching albums, artists and tracks. You can filter on a single year or a range (e.g. 1955-1960).
The album filter can be used while searching albums and tracks.
The genre filter can be used while searching artists and tracks.
The isrc and track filters can be used while searching tracks.
The upc, tag:new and tag:hipster filters can only be used while searching albums. The tag:new filter will return albums released in the past two weeks and tag:hipster can be used to return only albums with the lowest 10% popularity.

Example: q=“remaster track:Doxy artist:Miles Davis”

**Parameters**

- `q` _(string, required)_ The search query

- `types` _(array, required)_ The types of results to return, Valid values are ‘album’, ‘artist’, ‘playlist’, ‘track’, ‘show’, ‘episode’, ‘audiobook’

- `limit` _(integer, optional)_ The maximum number of results to return. Defaults to `1`.


## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_spotify\\
```](https://docs.arcade.dev/home/install/overview)

[Zoom](https://docs.arcade.dev/toolkits/social-communication/zoom "Zoom") [Twitch](https://docs.arcade.dev/toolkits/entertainment/twitch "Twitch")
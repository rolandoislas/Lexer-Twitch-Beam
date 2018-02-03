#!/usr/bin/env python3
# Python script that handles starting the Lexer-Twitch-Beam server, restarting
# it when necessary and streaming to Twitch and Mixer.
#
# Changelog
#
# Version 1.0
#   Initial release

import argparse
import subprocess

import time

import os

lexer = None
twitch = None
mixer = None

twitch_stream_args = []
mixer_stream_args = []


def parse_args():
    """
    Parse arguments
    :return: None
    """
    global twitch_stream_args
    global mixer_stream_args
    arg_parser = argparse.ArgumentParser(description="Lexer-Twitch-Beam Stream Helper")
    arg_parser.add_argument("twitch_stream_key", type=str, help="Twitch stream key")
    arg_parser.add_argument("mixer_stream_key", type=str, help="Mixer stream key")
    arg_parser.add_argument("-port", type=str, help="Server port")
    args = arg_parser.parse_args()
    # Create the out directory
    cwd = os.path.dirname(os.path.realpath(__file__))
    if not os.path.isdir(cwd + "/out/twitch"):
        os.makedirs(cwd + "/out/twitch")
    if not os.path.isdir(cwd + "/out/mixer"):
        os.makedirs(cwd + "/out/mixer")
    # Create streamsite commands
    port = args.port if args.port else "80"
    if args.twitch_stream_key:
        url = "http://localhost:" + port + "/twitch"
        rtmp = "rtmp://live-lax.twitch.tv/app/" + args.twitch_stream_key
        twitch_stream_args = ["streamsite", url, rtmp,
                              "-width-website", "1280",
                              "-height-website", "720",
                              "-delay", "1",
                              "-width-video", "1280",
                              "-height-video", "720",
                              "-video-bitrate", "2500k",
                              "-audio-bitrate", "96k",
                              "-keyint", "2",
                              "-fps", "30",
                              "-background", "#ffffff",
                              "-format", "jpg",
                              "-dir", cwd + "/out/twitch"]
    if args.mixer_stream_key:
        url = "http://localhost:" + port + "/beam"
        rtmp = "rtmp://ingest-sjc.mixer.com:1935/beam/" + args.mixer_stream_key
        mixer_stream_args = ["streamsite", url, rtmp,
                             "-width-website", "1280",
                             "-height-website", "720",
                             "-delay", "1",
                             "-width-video", "1280",
                             "-height-video", "720",
                             "-video-bitrate", "2500k",
                             "-audio-bitrate", "96k",
                             "-keyint", "2",
                             "-fps", "30",
                             "-background", "#ffffff",
                             "-format", "jpg",
                             "-dir", cwd + "/out/beam"]


parse_args()
running = True
while running:
    # Lexer
    if lexer is None or lexer.poll():
        print("Starting Lexer")
        lexer = subprocess.Popen(["./run.sh"])
    # Twitch stream
    if len(twitch_stream_args) > 0 and (twitch is None or twitch.poll()):
        print("Starting Twitch stream")
        twitch = subprocess.Popen(twitch_stream_args)
    # Mixer stream
    if len(mixer_stream_args) > 0 and (mixer is None or mixer.poll()):
        print("Starting Mixer stream")
        mixer = subprocess.Popen(mixer_stream_args)
    time.sleep(1)

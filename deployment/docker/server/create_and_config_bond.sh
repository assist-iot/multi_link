#!/bin/bash
# script.sh bondInterface bondIP
# script.sh br0

bondInterface=$1
bondIP=$2

# load required module

modprobe bonding

# create bonding interface

ip link add $bondInterface type bridge

ip link set "$bondInterface" up

ip addr add ${bondIP}/24 dev $bondInterface

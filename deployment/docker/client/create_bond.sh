#!/bin/bash
# script.sh bond0 bonding_mode primary arp_ip_target arp_interval_ms bond_ip fail_over_mac arp_validate
# script.sh bond0 1 tap1 10.8.0.254 50 10.8.0.253 1 5


bondInterface=$1
bonding_mode=$2
primary=$3
arp_ip_target=$4
arp_interval=$5
bondIP=$6
fail_over_mac=$7
arp_validate=$8

# load required module

modprobe bonding

# create bonding interface

ip link add $bondInterface type bond

# define the bonding parameters

ip link set dev ${bondInterface} type bond mode $bonding_mode
echo $primary > /sys/class/net/${bondInterface}/bonding/primary
ip link set dev ${bondInterface} type bond fail_over_mac $fail_over_mac
ip link set dev ${bondInterface} type bond arp_interval $arp_interval
ip link set dev ${bondInterface} type bond arp_ip_target $arp_ip_target
ip link set dev ${bondInterface} type bond arp_validate $arp_validate

ip link set "$bondInterface" up

ip addr add ${bondIP}/24 dev $bondInterface


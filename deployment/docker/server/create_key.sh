#!/bin/bash

mkdir -p /etc/openvpn/server

[ -f /etc/openvpn/ta.key ] && echo "Keyfile exists - unchanged." || \
(
  echo "Keyfile does not exist - generating new one"
  openvpn --genkey --secret /etc/openvpn/ta.key
)

echo "# #############################################"
echo "# below is your secret key - you need to copy"
echo "# this onto your client into the file"
echo "# /etc/openvpn/ta.key"
echo "# #############################################"

cat /etc/openvpn/ta.key

echo "# #############################################"
echo "# #############################################"




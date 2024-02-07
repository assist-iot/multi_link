<div align="center">
    <img alt="Fiber" height="90" src="https://user-images.githubusercontent.com/100677511/170439941-58810f43-b437-41e5-9976-899b60cf1e5e.png">
  <br>
</div>

# 🔌 Multi-link enabler


[![Technologies](https://skills.thijs.gg/icons?i=bash,nodejs,kubernetes&theme=light)](https://skills.thijs.gg)

## 💡 Introduction

The main goal of this enabler is to manage different wireless access networks, so in case the primary link is down a second one is up without noticing (at least, not by the user) any kind of service disruption.

## ⚡Features

The enabler consists of two sides, client and server. The way to interconnect this devices by various interfaces is as described:

  1. The server creates a tap tunnel (Layer 2) for each interface and waits for new connections.
  2. The client connects to the tunnels using all the available interfaces.
  3. The tap tunnels (Layer 2) are interconnected and upgraded to Layer 3 through the use of bonding and bridging in the client and server, respectively. 

![](./images/multilink_video.gif)

## ⚠️ Pre-requisites

1. **Kubernetes and Helm environment**. The kubernetes and helm configuration must be applied. To install it you can follow the process and scripts in the [Smart-Orchestrator](https://gitlab.assist-iot.eu/wp4/network/smart-orchestrator) documentation.


## 📖 Installation

Before to proceed to deploy the helm charts, it has to be configured the network and interfaces that will be used, in the server and the client. 


### ⚙️ Server configuration:

1. Clone the repo in the <b>server</b> machine:

```bash
git clone https://gitlab.assist-iot.eu/wp4/network/multi-link.git
cd multi-link
``` 

2. Open the values file of the <b>server</b> with your preferred editor 

```bash
nano deployment/helm/server/values.yaml
``` 

3. By default the helm chart deploy the API in the port 3333, taking into account that the deployment has access to the host network (hostNetwork flag is true) if you already use this port or you want to change it change the sections:


- ```api.service```

```
# Configuration of the service: type and ports.
  service:
    type: NodePort
    ports:
      api:
        port: 3333
        targetPort: 3333
        containerPort: 3333
        nodePort: ""
        protocol: TCP
```

- ```api.envVars.apiMultilinkServerPort```

```
  envVars:
    exampleEnvVar: exampleValue
    apiMultilinkServerPort: 3333
```

4. Modify the serverConfig with your configuration. If you don't need to change the values (don't have already an interface called br0) it is recommended to leave this section as it is.

- **bridge_interface**: Name of the bridge interface that will be created in the server host network. Change it only if there exists already an interface named <b>"br0"</b> in your host network.
- **bridge_ip**: IP address of the bridge interface. It has per default a netmask /24 so <b>not include</b> it in the value.
- **links**: number of links (interfaces) that will be used to communicate with the client.
```
####################################### VALUES TO CONFIG THE SERVER #######################################

serverConfig:
  bridge_interface: br0
  bridge_ip: 10.8.0.254
  links: 2

################################################### END ###################################################
```

5. Deploy the helm chart of the multilink-server:

```
helm install multilink-server ./deployment/server/helm/multilink-server
```


### ⚙️ Client configuration

1. Clone the repo in the <b>client</b> machine:

```bash
git clone https://gitlab.assist-iot.eu/wp4/network/multi-link.git
cd multi-link
``` 

2. Open the values file of the <b>client</b> with your preferred editor

```bash
nano deployment/helm/client/values.yaml
``` 

3. By default the helm chart deploy the API in the port 3333, taking into account that the deployment has access to the host network (hostNetwork flag at true) if you already use this port or you want to change it change the sections:


- ```api.service```

```
# Configuration of the service: type and ports.
  service:
    type: NodePort
    ports:
      api:
        port: 3333
        targetPort: 3333
        containerPort: 3333
        nodePort: ""
        protocol: TCP
```

- ```api.envVars.apiMultilinkClientPort```

```
  envVars:
    exampleEnvVar: exampleValue
    # Port where it is exposed the api
    apiMultilinkClientPort: 3333
```

4. Modify the clientConfig section with your configuration.

- **serverApiUrl**: This is the http address by which the API of the multilink-server can be reached. In the example is the ethernet ip of the server.
- **bondInterfaceName**: Name of the bond interface that will be created in the client host network. Change it only if there exists already an interface named <b>"bond0"</b> in your host network.
- **bondIpAddress**: IP address of the bond interface. It has per default a netmask /24 so <b>not include</b> it in the value.
- **slaves**: This is a json array of all the interfaces that will be configured in the bond. The info needed for each interface is:
  -  **hw_int**: interface name. 
  -  **ip_server**: IP address of the server that can be reach by this interface. In the expample this is the ip of the server in the ethernet and wifi networks.
  - **netmask**: Netmask of the network.

The rest of the values are referred to the bond configuration, the only parameters that need to be changed are:

- **primary**: This is the interface that will be used as primary what means that always this interface is active and has connectivity with the server it will be used to communicate with. Each interface in the slaves array will have attached a tap tunnel, the name of the tunnel will be tap followd by the number in the array (check the clientConfig.slaves array an pick your primary interface).
- **arp_ip_target**: This will be the IP of the other extreme of the tunnels what means the ip of the server bridge (previous section configured).

The rest of the parameters of the bonding it is recommended to not change it, to know more about bonding parameters and their configuration check the [documentation](https://www.kernel.org/doc/Documentation/networking/bonding.txt).

```
####################################### VALUES TO CONFIG THE CLIENT #######################################

clientConfig:
  serverApiUrl: http://158.42.89.111:3333
  bondInterfaceName: bond0
  bondIpAddress: 10.8.0.253
  slaves: 
    [{                              #####
      "hw_int": "eth0",                 #
      "ip_server": "158.42.89.111",     #  tap1
      "netmask": "255.255.255.0"        #
    },                              #####
    {                               #####
      "hw_int": "wlan0",                #
      "ip_server": "192.168.150.100",   #  tap2
      "netmask": "255.255.255.0"        #
    }]                              #####                               

  primary: tap1
  arp_ip_target: 10.8.0.254 
  bonding_mode: 1
  arp_interval: 50 
  fail_over_mac: 1 
  arp_validate: 5

################################################### END ###################################################
```

5. Deploy the helm chart of the multilink-client:

```
helm install multilink-client ./deployment/client/helm/multilink-client
```

### ✅ Check multilink deployment

Once the client and the server have been deployed you can check the connectivity SERVER-CLIENT, executing in the SERVER machine:

```
ping <ip_client_side>
```

and CLIENT-SERVER, executing in the CLIENT machine:

```
ping <ip_server_side>
```
If the parameters ```bridge_ip``` and ```bondIpAddress``` are like the example you can test the connection by:

```
# SERVER-CLIENT:

ping 10.8.0.254

# CLIENT-SERVER:

ping 10.8.0.253
```
### ❌ Clean installation

If there is any error and don't know how to clean the deployment, we recommend to uninstall the helm charts and reboot the system, due all the changes in the host network and ip routes did by the multilink enabler are not persistent.

## 💡 Usage 

If everything has been installed correctly and you can reach all the sides (client and server). You will be able to make changes/test by making requests to the client/server API. To know more about the requests and how to do it please check the  ```/documentation/openapi.yaml``` and the example requests file  ```documentation\example-requests.sh```

#### Deployment with multi-link features

To make the multilink (client or server) accesible to a deployment/pod it is needed that this deployment/pod has the network of the host. So there is needed to have the flag ```hostNetwork: true``` in the deployment/pod manifest. There is an example template of a deployment that waits until the bonding is ready in the helm chart.

In the client side:
```
deployment/client/helm/multilink-client/templates/.deploymentwithbond
```

In the server side:
```
deployment/server/helm/multilink-server/templates/.deploymentwithbond
```
You can activate it deleting the "." character in the template title and modify the values file with your own deployment configuration.

## ⚠️ License

Copyright 2023 Juan Gascón Repullés (Universitat Politècnica de València)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

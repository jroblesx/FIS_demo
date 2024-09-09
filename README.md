# AWS Fault Injection Service
Este repositorio trata de ilustrar cómo podemos mejorar la confiabilidad de nuestros sistemas mediante AWS Fault Injection Service. Está basado en el repositorio https://github.com/davejfranco/fisdemo (Muchas gracias Dave).

## Prerequisitos
- aws-cli
- aws-cdk


## Setup
1. Clona el repositorio.
2. Configura AWS CLI y CDK CLI.
3. Ejecuta `cdk bootstrap` para preparar tu entorno de AWS para usar CDK.
4. Ejecuta `cdk deploy` para generar los recursos.
5. Copia el DNS de tu load balancer, lo usaremos mas adelante. Debe verse parecido a esto `http://FisDem-LB8A1-iRIraD08e4Lg-1046343921.us-east-1.elb.amazonaws.com`.

## Crea tu experimento
1. Ve a tu consola de AWS > Fault Injection Service.

2. Crea tu primer experimento y template.

3. Ejecuta el script `testEndpoint.sh`, para usarlo desde tu terminal ve al directorio infra y ejectua `./testEndpoint.sh <LoadBalancerDNSCopiadoEnElUltimoPasoDelSetup>`.

4. Todos los request deben retornar 200.

5. Ejecuta el Experimento y vuelve a probar el script, ahora debes ver que algunos requests retornan 504 o 503.

## Cleanup
Desde el directorio`infra` ejecuta `cdk destroy`.

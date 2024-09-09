import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
//ECS
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
//IAM
import * as iam from 'aws-cdk-lib/aws-iam';


// ECS Best Practices
// https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/deployment.html

const prefix = 'FISDemo';
const capacity = {
  nodeCount : 2,
  task: {
    minCapacity: 2,
    maxCapacity: 4,
    memoryLimitMiB: 256,
  },
  instanceType: new ec2.InstanceType('t2.micro'),
}
const healtcheck = {
    timeout: cdk.Duration.seconds(30),
    interval: cdk.Duration.seconds(60),
    path: '/',
}  

export class FisDemo extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Infrastructure Network
    const vpcName = `${prefix}-VPC`;
    const vpcCidr = '10.0.0.0/16';
    //const maxAzs = 3;
    
    const vpc = new ec2.Vpc(this, vpcName, {
      vpcName: vpcName,
      ipAddresses: ec2.IpAddresses.cidr(vpcCidr),
      //maxAzs: maxAzs,
      availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: `${prefix}-Public`,
          mapPublicIpOnLaunch: true,
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],

      natGateways: 0,
      createInternetGateway: true,
    });
  
    //ECS Cluster
    const cluster = new ecs.Cluster(this, `${prefix}-Cluster`, {
      vpc: vpc,
      clusterName: `${prefix}-Cluster`,

      //optional
      containerInsights: false,
    });
    //ECS Cluster Capacity 
     cluster.addCapacity(`${prefix}-asg`, {
       instanceType: capacity.instanceType, //ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
       //desiredCapacity: 2,
       minCapacity: capacity.nodeCount,
       maxCapacity: capacity.nodeCount,
       //healthCheck: autoscaling.HealthCheck.ec2({grace: cdk.Duration.seconds(60)}),
     });
    // Create Task Definition
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDef');
    const container = taskDefinition.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry("nginx:1.24-alpine"),
      memoryLimitMiB: capacity.task.memoryLimitMiB,
    });

    container.addPortMappings({
      containerPort: 80,
      hostPort: 8080,
      protocol: ecs.Protocol.TCP
    });

    // Create Service
    const service = new ecs.Ec2Service(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: capacity.task.minCapacity,
      placementStrategies: [
        ecs.PlacementStrategy.spreadAcrossInstances(),
        //ecs.PlacementStrategy.packedByCpu(),
      ],
    });

    // Service Auto Scaling
    const scaling = service.autoScaleTaskCount({ 
      maxCapacity: capacity.task.maxCapacity, 
      });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Create ALB
    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true   
    });
    const listener = lb.addListener('PublicListener', { port: 80, open: true });

    // Attach ALB to ECS Service
    listener.addTargets('ECS', {
      port: 8080,
      targets: [service.loadBalancerTarget({
        containerName: 'web',
        containerPort: 80
      })],
      healthCheck: {
        path: healtcheck.path,
        timeout: healtcheck.timeout,
        interval: healtcheck.interval     
      },
      loadBalancingAlgorithmType: elbv2.TargetGroupLoadBalancingAlgorithmType.ROUND_ROBIN,
    });

    // Output
    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: 'http://' + lb.loadBalancerDnsName });

    // Fault Injection Simulation
    // IAM Role
    const fisRole = new iam.Role(this, `${prefix}-role`, {
      roleName: `${prefix}-role`,
      assumedBy: new iam.ServicePrincipal('fis.amazonaws.com'),//Fault Injection Simulator Service Principal
      description: 'The role for FIS Demo',
    });
    
    // Attach Managed Policies
    const policyNames = [
    'service-role/AWSFaultInjectionSimulatorEC2Access',
    'service-role/AWSFaultInjectionSimulatorECSAccess'
    ]
    policyNames.forEach((policyName) => {
      fisRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(policyName) // Access to perform fault injection on EC2 instances
      );
    });
  }
}

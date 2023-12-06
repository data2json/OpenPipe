import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { nm } from "./helpers";
import { vpc } from "./vpc";
import { getSecret } from "./config";

const dbSecurityGroup = new aws.ec2.SecurityGroup(nm("app-db"), {
  vpcId: vpc.vpcId,
  ingress: [{ protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] }],
});

const dbSubnetGroup = new aws.rds.SubnetGroup(nm("app-db"), {
  subnetIds: [vpc.publicSubnetIds[0], vpc.publicSubnetIds[1]],
});

const dbName = "openpipe";

const password = new random.RandomPassword(nm("app-db-password"), {
  length: 32,
  special: false,
});

const dbInstance = new aws.rds.Instance(nm("app"), {
  username: "openpipe",
  password: password.result,
  dbName,
  instanceClass: "db.m5.large",
  allocatedStorage: 50,
  maxAllocatedStorage: 1024,
  engine: "postgres",
  engineVersion: "15.5",
  parameterGroupName: "default.postgres15",
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  publiclyAccessible: true,
  applyImmediately: true,
  backupRetentionPeriod: 30,
  performanceInsightsEnabled: true,
  // multiAz: true,
  // monitoringInterval: 60,
  // skipFinalSnapshot: true,
});

export const dbConnectionString = pulumi.secret(
  pulumi.interpolate`postgresql://${dbInstance.username}:${dbInstance.password}@${dbInstance.address}:${dbInstance.port}/${dbName}`,
);
// export const dbConnectionString = getSecret("DATABASE_URL");
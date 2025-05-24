---
url: "https://www.librechat.ai/docs/configuration/cdn/s3"
title: "GitHub"
---

Docs

⚙️ Configuration

CDN

Amazon S3

# Amazon S3 CDN Setup

Amazon S3 is a scalable, secure object storage service that can be used as a CDN for your static assets (such as images, CSS, and JavaScript) in LibreChat. Follow these steps to configure your S3 bucket.

## 1\. Create an AWS Account and Configure an IAM User (or Use IRSA) [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/s3\#1-create-an-aws-account-and-configure-an-iam-user-or-use-irsa)

### Option A: Using an IAM User with Explicit Credentials [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/s3\#option-a-using-an-iam-user-with-explicit-credentials)

1. **Sign in to AWS:**
   - Open the [AWS Management Console](https://aws.amazon.com/console/) and sign in with your account.
2. **Create or Use an Existing IAM User:**
   - Navigate to the **IAM (Identity and Access Management)** section.
   - Create a new IAM user with **Programmatic Access** or select an existing one.
   - Attach an appropriate policy (for example, `AmazonS3FullAccess` or a custom policy with limited S3 permissions).
   - After creating the user, you will receive an **AWS\_ACCESS\_KEY\_ID** and **AWS\_SECRET\_ACCESS\_KEY**. Store these securely.

### Option B: Using IRSA (IAM Roles for Service Accounts) in Kubernetes [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/s3\#option-b-using-irsa-iam-roles-for-service-accounts-in-kubernetes)

If you are deploying LibreChat on Kubernetes (e.g. on EKS), you can use IRSA to assign AWS permissions to your pods without having to provide explicit credentials. To use IRSA:

1. **Create a Trust Policy** for your EKS service account (example below):


```nextra-code
{
     "Version": "2012-10-17",
     "Statement": [\
       {\
         "Effect": "Allow",\
         "Principal": {\
           "Federated": "arn:aws:iam::{AWS_ACCOUNT}:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/{EKS_OIDC}"\
         },\
         "Action": "sts:AssumeRoleWithWebIdentity",\
         "Condition": {\
           "StringEquals": {\
             "oidc.eks.us-east-1.amazonaws.com/id/{EKS_OIDC}:sub": "system:serviceaccount:librechat:librechat",\
             "oidc.eks.us-east-1.amazonaws.com/id/{EKS_OIDC}:aud": "sts.amazonaws.com"\
           }\
         }\
       }\
     ]
}
```

2. **Create a Policy** that grants necessary S3 permissions (example below):

```nextra-code
{
  "Version": "2012-10-17",
  "Statement": [\
    {\
      "Sid": "VisualEditor0",\
      "Effect": "Allow",\
      "Action": [\
        "s3:PutObject",\
        "s3:GetObjectAcl",\
        "s3:GetObject",\
        "s3:ListBucket",\
        "s3:DeleteObject"\
      ],\
      "Resource": [\
        "arn:aws:s3:::my-example-librechat-bucket/*",\
        "arn:aws:s3:::my-example-librechat-bucket"\
      ]\
    }\
  ]
}
```

3. **Annotate your Kubernetes ServiceAccount:**

Ensure your LibreChat pods use a service account annotated for IRSA. This way, the AWS SDK in your application (using our updated S3 initialization code) will automatically use the temporary credentials provided by IRSA without needing the environment variables for AWS credentials.

## 2\. Create an S3 Bucket [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/s3\#2-create-an-s3-bucket)

1. **Open the S3 Console:**

- Go to the [Amazon S3 console](https://s3.console.aws.amazon.com/s3/).

2. **Create a New Bucket:**

- Click **“Create bucket”**.
- **Bucket Name:** Enter a unique name (e.g., `mylibrechatbucket`).
- **Region:** Select the AWS region closest to your users (for example, `us-east-1` or `eu-west-1`).
- **Configure Options:** Set other options as needed, then click **“Create bucket”**.

## 3\. Update Your Environment Variables [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/s3\#3-update-your-environment-variables)

If you are **not** using IRSA, create or update your `.env` file in your project’s root directory with the following configuration:

.env

```nextra-code
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=your_selected_region
AWS_BUCKET_NAME=your_bucket_name
AWS_ENDPOINT_URL=your_endpoint_url
```

- **AWS\_ACCESS\_KEY\_ID:** Your IAM user’s access key.
- **AWS\_SECRET\_ACCESS\_KEY:** Your IAM user’s secret key.
- **AWS\_REGION:** The AWS region where your S3 bucket is located.
- **AWS\_BUCKET\_NAME:** The name of the S3 bucket you created.
- **AWS\_ENDPOINT\_URL:** (Optional) The custom AWS endpoint URL

If you are using **IRSA** on Kubernetes, you do **not** need to set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your environment. The AWS SDK will automatically obtain temporary credentials via the service account assigned to your pod. Ensure that `AWS_REGION` and `AWS_BUCKET_NAME` are still provided.

## 4\. Configure LibreChat to Use Amazon S3 [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/s3\#4-configure-librechat-to-use-amazon-s3)

Update your LibreChat configuration file ( `librechat.yaml`) to specify that the application should use Amazon S3 for file handling:

librechat.yaml

```nextra-code
version: 1.0.8
cache: true
fileStrategy: "s3"
```

This setting tells LibreChat to use the S3 implementation provided in your code.

## Summary [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/s3\#summary)

1. **Create an AWS Account & IAM User (or configure IRSA):**

- For traditional deployments, create an IAM user with programmatic access and obtain your access keys.
- For Kubernetes deployments (e.g., on EKS), set up IRSA so that your pods automatically obtain temporary credentials.

2. **Create an S3 Bucket:**

- Use the Amazon S3 console to create a bucket, choosing a unique name and region.

3. **Update Environment Variables:**

- For non-IRSA: set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_BUCKET_NAME` in your `.env` file.
- For IRSA: set only `AWS_REGION` and `AWS_BUCKET_NAME`; ensure your pod’s service account is correctly annotated.

4. **Configure LibreChat:**

- Set `fileStrategy` to `"s3"` in your `librechat.yaml` configuration file.

With these steps, your LibreChat application will use Amazon S3 to handle file uploads, downloads, and deletions, leveraging S3 as your CDN for static assets. Additionally, with IRSA support, your application can run securely on Kubernetes without embedding long-term AWS credentials.

ℹ️

Note

Always ensure your AWS credentials remain secure. Do not commit them to a public repository. Adjust IAM policies to follow the principle of least privilege as needed.

Last updated on April 27, 2025

[Intro](https://www.librechat.ai/docs/configuration/cdn "Intro") [Azure Blob Storage](https://www.librechat.ai/docs/configuration/cdn/azure "Azure Blob Storage")
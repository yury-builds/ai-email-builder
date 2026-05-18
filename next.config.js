/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@puckeditor/core", "@react-email/components", "@react-email/render"],
};

module.exports = nextConfig;

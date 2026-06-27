// ~6 seed leads. Hero prospect (index 0) has a real postal address and a
// placeholder you-own email so Lob / Resend demos work out of the box.

import type { PostcardAddress } from "@/lib/clients/lobClient";

export interface SeedLead {
  name: string;
  title: string;
  company: string;
  domain: string;
  industry: string;
  email?: string;
  address?: PostcardAddress;
}

export const SEED_LEADS: SeedLead[] = [
  {
    // Hero prospect — has postal address + placeholder email
    name: "Sarah Chen",
    title: "VP of Sales",
    company: "Meridian Fintech",
    domain: "meridianfintech.io",
    industry: "fintech",
    email: "imahmedali+hero@gmail.com",
    address: {
      name: "Sarah Chen",
      address_line1: "760 Market St Ste 300",
      address_city: "San Francisco",
      address_state: "CA",
      address_zip: "94102",
      address_country: "US",
    },
  },
  {
    name: "Marcus Rivera",
    title: "Head of Revenue",
    company: "Stackline Analytics",
    domain: "stacklineanalytics.com",
    industry: "software / analytics",
    email: "imahmedali+lead2@gmail.com",
  },
  {
    name: "Priya Nair",
    title: "VP Sales",
    company: "Orbital SaaS",
    domain: "orbitalsaas.io",
    industry: "software / SaaS",
    email: "imahmedali+lead3@gmail.com",
  },
  {
    name: "James Park",
    title: "Chief Revenue Officer",
    company: "Nexus Cloud",
    domain: "nexuscloud.ai",
    industry: "cloud software",
    email: "imahmedali+lead4@gmail.com",
  },
  {
    name: "Elena Vasquez",
    title: "Head of Sales",
    company: "Vantage Payments",
    domain: "vantagepayments.com",
    industry: "fintech / payments",
    email: "imahmedali+lead5@gmail.com",
  },
  {
    name: "David Kim",
    title: "RevOps Director",
    company: "Aperture Data",
    domain: "aperturedata.io",
    industry: "software / data",
    email: "imahmedali+lead6@gmail.com",
  },
];

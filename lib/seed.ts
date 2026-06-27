import type { PostalAddress } from "@/lib/types";

export interface SeedLead {
  name: string;
  title: string;
  company: string;
  domain: string;
  industry: string;
  email?: string;
  postalAddress: PostalAddress;
}

export const SEED_LEADS: SeedLead[] = [
  {
    // Hero prospect — real postal address + placeholder email for Lob/Resend demo
    name: "Sarah Chen",
    title: "VP of Sales",
    company: "Meridian Fintech",
    domain: "meridianfintech.io",
    industry: "fintech",
    email: "imahmedali+hero@gmail.com",
    postalAddress: {
      line1: "760 Market St Ste 300",
      city: "San Francisco",
      state: "CA",
      postcode: "94102",
      country: "US",
    },
  },
  {
    name: "Marcus Rivera",
    title: "Head of Revenue",
    company: "Stackline Analytics",
    domain: "stacklineanalytics.com",
    industry: "software",
    email: "imahmedali+lead2@gmail.com",
    postalAddress: {
      line1: "300 W 6th St Ste 1500",
      city: "Austin",
      state: "TX",
      postcode: "78701",
      country: "US",
    },
  },
  {
    name: "Priya Nair",
    title: "VP Sales",
    company: "Orbital SaaS",
    domain: "orbitalsaas.io",
    industry: "software",
    email: "imahmedali+lead3@gmail.com",
    postalAddress: {
      line1: "1201 3rd Ave Ste 2200",
      city: "Seattle",
      state: "WA",
      postcode: "98101",
      country: "US",
    },
  },
  {
    name: "James Park",
    title: "Chief Revenue Officer",
    company: "Nexus Cloud",
    domain: "nexuscloud.ai",
    industry: "software",
    email: "imahmedali+lead4@gmail.com",
    postalAddress: {
      line1: "100 Park Ave Fl 16",
      city: "New York",
      state: "NY",
      postcode: "10017",
      country: "US",
    },
  },
  {
    name: "Elena Vasquez",
    title: "Head of Sales",
    company: "Vantage Payments",
    domain: "vantagepayments.com",
    industry: "fintech",
    email: "imahmedali+lead5@gmail.com",
    postalAddress: {
      line1: "233 S Wacker Dr Ste 4400",
      city: "Chicago",
      state: "IL",
      postcode: "60606",
      country: "US",
    },
  },
  {
    name: "David Kim",
    title: "RevOps Director",
    company: "Aperture Data",
    domain: "aperturedata.io",
    industry: "software",
    email: "imahmedali+lead6@gmail.com",
    postalAddress: {
      line1: "101 Federal St Ste 1900",
      city: "Boston",
      state: "MA",
      postcode: "02110",
      country: "US",
    },
  },
];

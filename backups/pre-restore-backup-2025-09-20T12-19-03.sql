--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ChannelType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ChannelType" AS ENUM (
    'BOOKING_COM',
    'EXPEDIA',
    'AIRBNB',
    'VRBO',
    'OTHER'
);


ALTER TYPE public."ChannelType" OWNER TO postgres;

--
-- Name: PropertyRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PropertyRole" AS ENUM (
    'PROPERTY_MGR',
    'FRONT_DESK',
    'HOUSEKEEPING',
    'MAINTENANCE',
    'SECURITY',
    'GUEST_SERVICES',
    'ACCOUNTANT',
    'IT_SUPPORT'
);


ALTER TYPE public."PropertyRole" OWNER TO postgres;

--
-- Name: ReservationSource; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReservationSource" AS ENUM (
    'WEBSITE',
    'PHONE',
    'WALK_IN',
    'CHANNEL'
);


ALTER TYPE public."ReservationSource" OWNER TO postgres;

--
-- Name: ReservationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReservationStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'NO_SHOW'
);


ALTER TYPE public."ReservationStatus" OWNER TO postgres;

--
-- Name: ShiftType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ShiftType" AS ENUM (
    'MORNING',
    'EVENING',
    'NIGHT',
    'FLEXIBLE'
);


ALTER TYPE public."ShiftType" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'ORG_ADMIN',
    'PROPERTY_MGR',
    'FRONT_DESK',
    'HOUSEKEEPING',
    'MAINTENANCE',
    'ACCOUNTANT',
    'OWNER',
    'IT_SUPPORT',
    'SECURITY'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Amenity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Amenity" (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Amenity" OWNER TO postgres;

--
-- Name: Channel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Channel" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    type public."ChannelType" NOT NULL,
    credentials jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Channel" OWNER TO postgres;

--
-- Name: DailyRate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DailyRate" (
    id text NOT NULL,
    "roomTypeId" text NOT NULL,
    date date NOT NULL,
    "basePrice" double precision NOT NULL,
    availability integer,
    "minLOS" integer,
    "maxLOS" integer,
    "closedToArrival" boolean DEFAULT false NOT NULL,
    "closedToDeparture" boolean DEFAULT false NOT NULL,
    restrictions jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "pricingId" text
);


ALTER TABLE public."DailyRate" OWNER TO postgres;

--
-- Name: Favorite; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Favorite" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roomId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Favorite" OWNER TO postgres;

--
-- Name: InvitationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InvitationToken" (
    id text NOT NULL,
    email text NOT NULL,
    "organizationId" text NOT NULL,
    role public."UserRole" NOT NULL,
    "propertyId" text,
    "propertyRole" public."PropertyRole",
    shift public."ShiftType",
    phone text,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "usedAt" timestamp(3) without time zone
);


ALTER TABLE public."InvitationToken" OWNER TO postgres;

--
-- Name: Organization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    domain text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stripeAccountId" text,
    "stripeChargesEnabled" boolean DEFAULT false NOT NULL,
    "stripeOnboardingComplete" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Organization" OWNER TO postgres;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "reservationId" text NOT NULL,
    type text NOT NULL,
    method text NOT NULL,
    status text NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "gatewayTxId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    "paymentMethodId" text,
    "processedAt" timestamp(3) without time zone
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: PaymentMethod; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaymentMethod" (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "stripePaymentMethodId" text NOT NULL,
    type text NOT NULL,
    "cardBrand" text,
    "cardLast4" text,
    "cardExpMonth" integer,
    "cardExpYear" integer,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PaymentMethod" OWNER TO postgres;

--
-- Name: PaymentTransaction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaymentTransaction" (
    id text NOT NULL,
    "reservationId" text NOT NULL,
    "stripePaymentIntentId" text,
    "stripeRefundId" text,
    type text NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text NOT NULL,
    "paymentMethod" text,
    "failureReason" text,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PaymentTransaction" OWNER TO postgres;

--
-- Name: Property; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Property" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Property" OWNER TO postgres;

--
-- Name: PropertySettings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PropertySettings" (
    id text NOT NULL,
    "orgId" text,
    "propertyType" text NOT NULL,
    "propertyName" text NOT NULL,
    "propertyPhone" text NOT NULL,
    "propertyEmail" text NOT NULL,
    "propertyWebsite" text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    country text NOT NULL,
    street text NOT NULL,
    suite text,
    city text NOT NULL,
    state text NOT NULL,
    zip text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    "isManuallyPositioned" boolean DEFAULT false NOT NULL,
    photos jsonb,
    "printHeader" text,
    "printHeaderImage" text,
    description jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "propertyId" text
);


ALTER TABLE public."PropertySettings" OWNER TO postgres;

--
-- Name: RateChangeLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RateChangeLog" (
    id text NOT NULL,
    "roomTypeId" text NOT NULL,
    date date,
    "oldPrice" double precision,
    "newPrice" double precision NOT NULL,
    "changeType" text NOT NULL,
    reason text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RateChangeLog" OWNER TO postgres;

--
-- Name: Refund; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Refund" (
    id text NOT NULL,
    "stripeRefundId" text NOT NULL,
    "reservationId" text NOT NULL,
    amount double precision NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reason text
);


ALTER TABLE public."Refund" OWNER TO postgres;

--
-- Name: Reservation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Reservation" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "roomId" text NOT NULL,
    "userId" text,
    "guestName" text,
    "checkIn" timestamp(3) without time zone NOT NULL,
    "checkOut" timestamp(3) without time zone NOT NULL,
    source public."ReservationSource" NOT NULL,
    "channelId" text,
    status public."ReservationStatus" DEFAULT 'PENDING'::public."ReservationStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    adults integer DEFAULT 1 NOT NULL,
    children integer DEFAULT 0 NOT NULL,
    notes text,
    email text,
    "idNumber" text,
    "idType" text,
    "issuingCountry" text,
    phone text,
    "propertyId" text NOT NULL,
    "amountCaptured" integer,
    "amountHeld" integer,
    "depositAmount" integer,
    "depositDueDate" timestamp(3) without time zone,
    "finalPaymentDue" timestamp(3) without time zone,
    "paymentStatus" text,
    "paymentTerms" text,
    "stripeCustomerId" text,
    "stripePaymentIntentId" text,
    "paidAmount" double precision,
    "refundedAmount" double precision
);


ALTER TABLE public."Reservation" OWNER TO postgres;

--
-- Name: Room; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Room" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    capacity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "imageUrl" text,
    "pricingId" text,
    "sizeSqFt" integer,
    description text,
    "doorlockId" text,
    "roomTypeId" text,
    "propertyId" text NOT NULL
);


ALTER TABLE public."Room" OWNER TO postgres;

--
-- Name: RoomImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoomImage" (
    id text NOT NULL,
    "roomId" text NOT NULL,
    url text NOT NULL,
    caption text,
    sort integer
);


ALTER TABLE public."RoomImage" OWNER TO postgres;

--
-- Name: RoomPricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoomPricing" (
    id text NOT NULL,
    "basePrice" double precision NOT NULL,
    "weekdayPrice" double precision,
    "weekendPrice" double precision,
    currency text DEFAULT 'INR'::text NOT NULL,
    mode text DEFAULT 'MANUAL'::text NOT NULL,
    availability integer,
    "minLOS" integer,
    "maxLOS" integer,
    "closedToArrival" boolean DEFAULT false NOT NULL,
    "closedToDeparture" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "roomId" text NOT NULL
);


ALTER TABLE public."RoomPricing" OWNER TO postgres;

--
-- Name: RoomType; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoomType" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    abbreviation text,
    "privateOrDorm" text DEFAULT 'private'::text NOT NULL,
    "physicalOrVirtual" text DEFAULT 'physical'::text NOT NULL,
    "maxOccupancy" integer DEFAULT 1 NOT NULL,
    "maxAdults" integer DEFAULT 1 NOT NULL,
    "maxChildren" integer DEFAULT 0 NOT NULL,
    "adultsIncluded" integer DEFAULT 1 NOT NULL,
    "childrenIncluded" integer DEFAULT 0 NOT NULL,
    description text,
    amenities text[],
    "customAmenities" text[],
    "featuredImageUrl" text,
    "additionalImageUrls" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    availability integer,
    "basePrice" double precision,
    "closedToArrival" boolean DEFAULT false NOT NULL,
    "closedToDeparture" boolean DEFAULT false NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    "maxLOS" integer,
    "minLOS" integer,
    "weekdayPrice" double precision,
    "weekendPrice" double precision,
    "propertyId" text NOT NULL
);


ALTER TABLE public."RoomType" OWNER TO postgres;

--
-- Name: SeasonalRate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SeasonalRate" (
    id text NOT NULL,
    name text NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    multiplier double precision NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "roomTypeId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "pricingId" text
);


ALTER TABLE public."SeasonalRate" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    image text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    phone text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserOrg; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserOrg" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "organizationId" text NOT NULL,
    role public."UserRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserOrg" OWNER TO postgres;

--
-- Name: UserProperty; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserProperty" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "propertyId" text NOT NULL,
    role public."PropertyRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    shift public."ShiftType"
);


ALTER TABLE public."UserProperty" OWNER TO postgres;

--
-- Name: WebhookEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."WebhookEvent" (
    id text NOT NULL,
    "stripeEventId" text NOT NULL,
    "eventType" text NOT NULL,
    "processedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data jsonb NOT NULL,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WebhookEvent" OWNER TO postgres;

--
-- Name: _RoomAmenities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_RoomAmenities" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_RoomAmenities" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: Amenity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Amenity" (id, name) FROM stdin;
\.


--
-- Data for Name: Channel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Channel" (id, "organizationId", name, type, credentials, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DailyRate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DailyRate" (id, "roomTypeId", date, "basePrice", availability, "minLOS", "maxLOS", "closedToArrival", "closedToDeparture", restrictions, notes, "createdAt", "updatedAt", "pricingId") FROM stdin;
\.


--
-- Data for Name: Favorite; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Favorite" (id, "userId", "roomId", "createdAt") FROM stdin;
\.


--
-- Data for Name: InvitationToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InvitationToken" (id, email, "organizationId", role, "propertyId", "propertyRole", shift, phone, token, "expiresAt", "createdBy", "createdAt", used, "usedAt") FROM stdin;
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Organization" (id, name, domain, "createdAt", "updatedAt", "stripeAccountId", "stripeChargesEnabled", "stripeOnboardingComplete") FROM stdin;
cmfs7qxl30000njk429tfn4f2	Grand Palace Hotel	example.com	2025-09-20 11:56:51.976	2025-09-20 11:56:51.976	\N	f	f
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "reservationId", type, method, status, amount, currency, "gatewayTxId", notes, "createdAt", description, "paymentMethodId", "processedAt") FROM stdin;
cmfs7qy39004cnjk44gp6zen9	cmfs7qy290040njk4uldbyhxn	BOOKING	CREDIT_CARD	COMPLETED	360	USD	\N	Full payment received	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy3a004knjk4waryndp6	cmfs7qy29003unjk4x6urgz7j	DEPOSIT	CREDIT_CARD	COMPLETED	1125	USD	\N	Partial payment - 50% deposit	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy3a004mnjk4aeazztvj	cmfs7qy29003ynjk4h6xc09oq	BOOKING	CREDIT_CARD	COMPLETED	360	USD	\N	Full payment received	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy39004anjk4b2fr3r5w	cmfs7qy29003knjk49vnb9njh	BOOKING	CREDIT_CARD	COMPLETED	360	USD	\N	Full payment received	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy3a004pnjk40l6hff60	cmfs7qy290042njk45fr4rsh2	DEPOSIT	CREDIT_CARD	COMPLETED	525	USD	\N	Partial payment - 50% deposit	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy39004fnjk4bnl3xwbh	cmfs7qy29003tnjk4gymn2xna	DEPOSIT	CREDIT_CARD	COMPLETED	1125	USD	\N	Partial payment - 50% deposit	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy39004enjk4zhbog7bl	cmfs7qy29003onjk4dbgu2t1l	DEPOSIT	CREDIT_CARD	COMPLETED	270	USD	\N	Partial payment - 50% deposit	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy39004injk4bocrpq3v	cmfs7qy2a0043njk4jvjxfbgx	BOOKING	CREDIT_CARD	COMPLETED	360	USD	\N	Full payment received	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy3a004lnjk464dmeebc	cmfs7qy29003wnjk49nm81q94	DEPOSIT	CREDIT_CARD	COMPLETED	525	USD	\N	Partial payment - 50% deposit	2025-09-20 11:56:52.63	\N	\N	\N
cmfs7qy3a004onjk4z2wuinea	cmfs7qy2a0045njk4v6z54fk4	BOOKING	CREDIT_CARD	COMPLETED	360	USD	\N	Full payment received	2025-09-20 11:56:52.63	\N	\N	\N
\.


--
-- Data for Name: PaymentMethod; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaymentMethod" (id, "customerId", "stripePaymentMethodId", type, "cardBrand", "cardLast4", "cardExpMonth", "cardExpYear", "isDefault", "createdAt") FROM stdin;
\.


--
-- Data for Name: PaymentTransaction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaymentTransaction" (id, "reservationId", "stripePaymentIntentId", "stripeRefundId", type, amount, currency, status, "paymentMethod", "failureReason", reason, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Property; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Property" (id, "organizationId", name, address, phone, email, timezone, currency, "isActive", "createdAt", "updatedAt", "isDefault") FROM stdin;
cmfs7qxle0002njk44p5cacb3	cmfs7qxl30000njk429tfn4f2	Grand Palace Hotel - Main Property	123 Main Street, Downtown	+1-555-0123	main@grandpalace.com	America/New_York	USD	t	2025-09-20 11:56:51.987	2025-09-20 11:56:51.987	t
cmfs7qxmx0004njk4nej4quv2	cmfs7qxl30000njk429tfn4f2	Grand Palace Beach Resort	456 Ocean Drive, Beach City	+1-555-0456	beach@grandpalace.com	America/New_York	USD	t	2025-09-20 11:56:51.987	2025-09-20 11:56:51.987	f
\.


--
-- Data for Name: PropertySettings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PropertySettings" (id, "orgId", "propertyType", "propertyName", "propertyPhone", "propertyEmail", "propertyWebsite", "firstName", "lastName", country, street, suite, city, state, zip, latitude, longitude, "isManuallyPositioned", photos, "printHeader", "printHeaderImage", description, "createdAt", "updatedAt", "propertyId") FROM stdin;
\.


--
-- Data for Name: RateChangeLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RateChangeLog" (id, "roomTypeId", date, "oldPrice", "newPrice", "changeType", reason, "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Refund; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Refund" (id, "stripeRefundId", "reservationId", amount, status, "createdAt", reason) FROM stdin;
\.


--
-- Data for Name: Reservation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Reservation" (id, "organizationId", "roomId", "userId", "guestName", "checkIn", "checkOut", source, "channelId", status, "createdAt", "updatedAt", adults, children, notes, email, "idNumber", "idType", "issuingCountry", phone, "propertyId", "amountCaptured", "amountHeld", "depositAmount", "depositDueDate", "finalPaymentDue", "paymentStatus", "paymentTerms", "stripeCustomerId", "stripePaymentIntentId", "paidAmount", "refundedAmount") FROM stdin;
cmfs7qy29003gnjk4ba5jashu	cmfs7qxl30000njk429tfn4f2	cmfs7qy0l002rnjk4s1wuijxl	\N	Guest User	2024-03-28 00:00:00	2024-03-31 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003knjk49vnb9njh	cmfs7qxl30000njk429tfn4f2	cmfs7qxul001jnjk46t5zsnab	\N	Guest User	2024-03-15 00:00:00	2024-03-18 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003unjk4x6urgz7j	cmfs7qxl30000njk429tfn4f2	cmfs7qxut0023njk420quu8gr	\N	Guest User	2024-06-22 00:00:00	2024-06-25 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003ynjk4h6xc09oq	cmfs7qxl30000njk429tfn4f2	cmfs7qxul001qnjk41mdgm5et	\N	Guest User	2024-06-08 00:00:00	2024-06-11 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy2a0043njk4jvjxfbgx	cmfs7qxl30000njk429tfn4f2	cmfs7qxus0021njk4qpfejn0u	\N	Guest User	2024-05-10 00:00:00	2024-05-13 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003znjk44qa6a5dw	cmfs7qxl30000njk429tfn4f2	cmfs7qxum001znjk4x49m9qse	\N	Guest User	2024-05-18 00:00:00	2024-05-21 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003snjk4c3s2dzz1	cmfs7qxl30000njk429tfn4f2	cmfs7qxum001xnjk4vxdlyulx	\N	Guest User	2024-04-12 00:00:00	2024-04-15 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003onjk4dbgu2t1l	cmfs7qxl30000njk429tfn4f2	cmfs7qxwz002fnjk4g1uzy99k	\N	Guest User	2024-03-22 00:00:00	2024-03-25 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy290042njk45fr4rsh2	cmfs7qxl30000njk429tfn4f2	cmfs7qy1q002tnjk4fiael6l2	\N	Guest User	2024-07-20 00:00:00	2024-07-23 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy2a0045njk4v6z54fk4	cmfs7qxl30000njk429tfn4f2	cmfs7qxul001onjk4fab8gcki	\N	Guest User	2024-07-05 00:00:00	2024-07-08 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003xnjk4xnjhpvol	cmfs7qxl30000njk429tfn4f2	cmfs7qy0a002pnjk41ez8ad5r	\N	Guest User	2024-06-15 00:00:00	2024-06-18 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003tnjk4gymn2xna	cmfs7qxl30000njk429tfn4f2	cmfs7qxuy002dnjk4n5818e85	\N	Guest User	2024-04-20 00:00:00	2024-04-23 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy290041njk4lkj00j5m	cmfs7qxl30000njk429tfn4f2	cmfs7qxuv0025njk4mi6vm5bs	\N	Guest User	2024-07-12 00:00:00	2024-07-15 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy29003wnjk49nm81q94	cmfs7qxl30000njk429tfn4f2	cmfs7qxzx002nnjk4v1zc7zr0	\N	Guest User	2024-05-25 00:00:00	2024-05-28 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfs7qy290040njk4uldbyhxn	cmfs7qxl30000njk429tfn4f2	cmfs7qxul001mnjk4peejxw9w	\N	Guest User	2024-04-05 00:00:00	2024-04-08 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-20 11:56:52.593	2025-09-20 11:56:52.593	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmfs7qxle0002njk44p5cacb3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Room; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Room" (id, "organizationId", name, type, capacity, "createdAt", "updatedAt", "imageUrl", "pricingId", "sizeSqFt", description, "doorlockId", "roomTypeId", "propertyId") FROM stdin;
cmfs7qxul001mnjk4peejxw9w	cmfs7qxl30000njk429tfn4f2	Room 102	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxum001znjk4x49m9qse	cmfs7qxl30000njk429tfn4f2	Room 203	Deluxe	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxle0002njk44p5cacb3
cmfs7qxus0021njk4qpfejn0u	cmfs7qxl30000njk429tfn4f2	Room 103	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxum001tnjk4lldti9nh	cmfs7qxl30000njk429tfn4f2	Room 107	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxul001jnjk46t5zsnab	cmfs7qxl30000njk429tfn4f2	Room 101	Standard	2	2025-09-20 11:56:52.317	2025-09-20 11:56:52.317	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxul001qnjk41mdgm5et	cmfs7qxl30000njk429tfn4f2	Room 104	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxut0023njk420quu8gr	cmfs7qxl30000njk429tfn4f2	Presidential Suite 402	Presidential	4	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001dnjk4tk95wpdd	cmfs7qxle0002njk44p5cacb3
cmfs7qxum001wnjk4wl0rhtuf	cmfs7qxl30000njk429tfn4f2	Room 110	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxul001onjk4fab8gcki	cmfs7qxl30000njk429tfn4f2	Room 105	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxum001snjk4ouezle3h	cmfs7qxl30000njk429tfn4f2	Room 108	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxuv0025njk4mi6vm5bs	cmfs7qxl30000njk429tfn4f2	Room 205	Deluxe	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxle0002njk44p5cacb3
cmfs7qxuv0027njk4e4zq9d9m	cmfs7qxl30000njk429tfn4f2	Room 109	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxum001xnjk4vxdlyulx	cmfs7qxl30000njk429tfn4f2	Room 202	Deluxe	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxle0002njk44p5cacb3
cmfs7qxuw0029njk4k1j1vn1i	cmfs7qxl30000njk429tfn4f2	Room 106	Standard	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001anjk4x2nllpl6	cmfs7qxle0002njk44p5cacb3
cmfs7qxux002bnjk4ul3n9l8i	cmfs7qxl30000njk429tfn4f2	Room 208	Deluxe	2	2025-09-20 11:56:52.319	2025-09-20 11:56:52.319	\N	\N	\N	\N	\N	cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxle0002njk44p5cacb3
cmfs7qxuy002dnjk4n5818e85	cmfs7qxl30000njk429tfn4f2	Presidential Suite 401	Presidential	4	2025-09-20 11:56:52.319	2025-09-20 11:56:52.319	\N	\N	\N	\N	\N	cmfs7qxu4001dnjk4tk95wpdd	cmfs7qxle0002njk44p5cacb3
cmfs7qxwz002fnjk4g1uzy99k	cmfs7qxl30000njk429tfn4f2	Room 201	Deluxe	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxle0002njk44p5cacb3
cmfs7qxxk002hnjk4mgsatx6h	cmfs7qxl30000njk429tfn4f2	Room 207	Deluxe	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxle0002njk44p5cacb3
cmfs7qxxy002jnjk4vqcvxaiw	cmfs7qxl30000njk429tfn4f2	Room 206	Deluxe	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxle0002njk44p5cacb3
cmfs7qxzl002lnjk4nhfbdq63	cmfs7qxl30000njk429tfn4f2	Suite 304	Suite	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001bnjk4trd8wlpn	cmfs7qxle0002njk44p5cacb3
cmfs7qxzx002nnjk4v1zc7zr0	cmfs7qxl30000njk429tfn4f2	Suite 302	Suite	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001bnjk4trd8wlpn	cmfs7qxle0002njk44p5cacb3
cmfs7qy0a002pnjk41ez8ad5r	cmfs7qxl30000njk429tfn4f2	Room 204	Deluxe	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxle0002njk44p5cacb3
cmfs7qy0l002rnjk4s1wuijxl	cmfs7qxl30000njk429tfn4f2	Suite 301	Suite	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001bnjk4trd8wlpn	cmfs7qxle0002njk44p5cacb3
cmfs7qy1q002tnjk4fiael6l2	cmfs7qxl30000njk429tfn4f2	Suite 303	Suite	2	2025-09-20 11:56:52.318	2025-09-20 11:56:52.318	\N	\N	\N	\N	\N	cmfs7qxu4001bnjk4trd8wlpn	cmfs7qxle0002njk44p5cacb3
cmfs7qy22002wnjk4yku5bhzn	cmfs7qxl30000njk429tfn4f2	Ocean Room 501	Ocean View	2	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001gnjk414247pct	cmfs7qxmx0004njk4nej4quv2
cmfs7qy22002xnjk4etz8a4oq	cmfs7qxl30000njk429tfn4f2	Ocean Room 502	Ocean View	2	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001gnjk414247pct	cmfs7qxmx0004njk4nej4quv2
cmfs7qy220030njk4bw3papik	cmfs7qxl30000njk429tfn4f2	Ocean Room 503	Ocean View	2	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001gnjk414247pct	cmfs7qxmx0004njk4nej4quv2
cmfs7qy220031njk4uekzbqdz	cmfs7qxl30000njk429tfn4f2	Ocean Room 504	Ocean View	2	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001gnjk414247pct	cmfs7qxmx0004njk4nej4quv2
cmfs7qy220036njk4sm1ew599	cmfs7qxl30000njk429tfn4f2	Ocean Room 506	Ocean View	2	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001gnjk414247pct	cmfs7qxmx0004njk4nej4quv2
cmfs7qy220038njk4cc0lz1pe	cmfs7qxl30000njk429tfn4f2	Beach Villa 603	Villa	4	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001hnjk4ymamqpnr	cmfs7qxmx0004njk4nej4quv2
cmfs7qy220037njk44vawy3ur	cmfs7qxl30000njk429tfn4f2	Beach Villa 601	Villa	4	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001hnjk4ymamqpnr	cmfs7qxmx0004njk4nej4quv2
cmfs7qy220039njk4gzfdazta	cmfs7qxl30000njk429tfn4f2	Beach Villa 602	Villa	4	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001hnjk4ymamqpnr	cmfs7qxmx0004njk4nej4quv2
cmfs7qy22003bnjk4kte4of76	cmfs7qxl30000njk429tfn4f2	Ocean Room 505	Ocean View	2	2025-09-20 11:56:52.586	2025-09-20 11:56:52.586	\N	\N	\N	\N	\N	cmfs7qxuh001gnjk414247pct	cmfs7qxmx0004njk4nej4quv2
\.


--
-- Data for Name: RoomImage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoomImage" (id, "roomId", url, caption, sort) FROM stdin;
\.


--
-- Data for Name: RoomPricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoomPricing" (id, "basePrice", "weekdayPrice", "weekendPrice", currency, mode, availability, "minLOS", "maxLOS", "closedToArrival", "closedToDeparture", "createdAt", "updatedAt", "roomId") FROM stdin;
\.


--
-- Data for Name: RoomType; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoomType" (id, "organizationId", name, abbreviation, "privateOrDorm", "physicalOrVirtual", "maxOccupancy", "maxAdults", "maxChildren", "adultsIncluded", "childrenIncluded", description, amenities, "customAmenities", "featuredImageUrl", "additionalImageUrls", "createdAt", "updatedAt", availability, "basePrice", "closedToArrival", "closedToDeparture", currency, "maxLOS", "minLOS", "weekdayPrice", "weekendPrice", "propertyId") FROM stdin;
cmfs7qxu4001anjk4x2nllpl6	cmfs7qxl30000njk429tfn4f2	Standard Room	\N	private	physical	2	1	0	1	0	Comfortable standard room with city view	{}	{}	\N	\N	2025-09-20 11:56:52.3	2025-09-20 11:56:52.3	10	2500	f	f	INR	\N	\N	2200	2800	cmfs7qxle0002njk44p5cacb3
cmfs7qxu4001dnjk4tk95wpdd	cmfs7qxl30000njk429tfn4f2	Presidential Suite	\N	private	physical	4	1	0	1	0	Ultimate luxury with panoramic views	{}	{}	\N	\N	2025-09-20 11:56:52.3	2025-09-20 11:56:52.3	2	12000	f	f	INR	\N	\N	10000	15000	cmfs7qxle0002njk44p5cacb3
cmfs7qxu4001cnjk4q7ng31hs	cmfs7qxl30000njk429tfn4f2	Deluxe Room	\N	private	physical	2	1	0	1	0	Spacious deluxe room with premium amenities	{}	{}	\N	\N	2025-09-20 11:56:52.3	2025-09-20 11:56:52.3	8	3500	f	f	INR	\N	\N	3200	3800	cmfs7qxle0002njk44p5cacb3
cmfs7qxu4001bnjk4trd8wlpn	cmfs7qxl30000njk429tfn4f2	Executive Suite	\N	private	physical	2	1	0	1	0	Luxury suite with separate living area	{}	{}	\N	\N	2025-09-20 11:56:52.3	2025-09-20 11:56:52.3	4	5500	f	f	INR	\N	\N	5000	6000	cmfs7qxle0002njk44p5cacb3
cmfs7qxuh001gnjk414247pct	cmfs7qxl30000njk429tfn4f2	Ocean View Room	\N	private	physical	2	1	0	1	0	Beautiful room with direct ocean views	{}	{}	\N	\N	2025-09-20 11:56:52.313	2025-09-20 11:56:52.313	6	3000	f	f	INR	\N	\N	2700	3300	cmfs7qxmx0004njk4nej4quv2
cmfs7qxuh001hnjk4ymamqpnr	cmfs7qxl30000njk429tfn4f2	Beach Villa	\N	private	physical	4	1	0	1	0	Luxury villa steps from the beach	{}	{}	\N	\N	2025-09-20 11:56:52.313	2025-09-20 11:56:52.313	3	8000	f	f	INR	\N	\N	7000	9000	cmfs7qxmx0004njk4nej4quv2
\.


--
-- Data for Name: SeasonalRate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SeasonalRate" (id, name, "startDate", "endDate", multiplier, "isActive", "roomTypeId", "createdAt", "updatedAt", "pricingId") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, name, image, "createdAt", "updatedAt", phone) FROM stdin;
cmfs7qxnv0007njk4g6m8nzd2	admin@example.com	Organization Admin	\N	2025-09-20 11:56:52.075	2025-09-20 11:56:52.075	\N
cmfs7qxnv0005njk4f0hhepb5	superadmin@example.com	Super Administrator	\N	2025-09-20 11:56:52.075	2025-09-20 11:56:52.075	\N
cmfs7qxq7000bnjk4f5t8gz0v	manager@example.com	John Property Manager	\N	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076	\N
cmfs7qxqr000enjk47i0vadr5	frontdesk@example.com	Sarah	\N	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076	\N
cmfs7qxr9000hnjk43vznsrhq	maintenance@example.com	Mike Maintenance	\N	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076	\N
cmfs7qxrv000knjk41pv8nif1	accountant@example.com	Lisa Accountant	\N	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076	\N
cmfs7qxsg000nnjk43nh2mgqy	it@example.com	Alex IT Support	\N	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076	\N
cmfs7qxt0000qnjk4o3r8gfyt	housekeeping@example.com	Maria Housekeeping	\N	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076	\N
cmfs7qxt2000tnjk4keywrsb7	owner@example.com	Robert Owner	\N	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076	\N
\.


--
-- Data for Name: UserOrg; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserOrg" (id, "userId", "organizationId", role, "createdAt", "updatedAt") FROM stdin;
cmfs7qxnv000anjk4s2a293n8	cmfs7qxnv0007njk4g6m8nzd2	cmfs7qxl30000njk429tfn4f2	ORG_ADMIN	2025-09-20 11:56:52.075	2025-09-20 11:56:52.075
cmfs7qxnv0009njk40i6jnspw	cmfs7qxnv0005njk4f0hhepb5	cmfs7qxl30000njk429tfn4f2	SUPER_ADMIN	2025-09-20 11:56:52.075	2025-09-20 11:56:52.075
cmfs7qxq7000dnjk47jfbgn84	cmfs7qxq7000bnjk4f5t8gz0v	cmfs7qxl30000njk429tfn4f2	PROPERTY_MGR	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076
cmfs7qxqr000gnjk4frtiviwu	cmfs7qxqr000enjk47i0vadr5	cmfs7qxl30000njk429tfn4f2	FRONT_DESK	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076
cmfs7qxr9000jnjk47outru2t	cmfs7qxr9000hnjk43vznsrhq	cmfs7qxl30000njk429tfn4f2	MAINTENANCE	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076
cmfs7qxrv000mnjk4m8jo5eg6	cmfs7qxrv000knjk41pv8nif1	cmfs7qxl30000njk429tfn4f2	ACCOUNTANT	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076
cmfs7qxsh000pnjk4tk8smrl8	cmfs7qxsg000nnjk43nh2mgqy	cmfs7qxl30000njk429tfn4f2	IT_SUPPORT	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076
cmfs7qxt0000snjk47nuj8gc2	cmfs7qxt0000qnjk4o3r8gfyt	cmfs7qxl30000njk429tfn4f2	HOUSEKEEPING	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076
cmfs7qxt2000vnjk4ujg4rpcx	cmfs7qxt2000tnjk4keywrsb7	cmfs7qxl30000njk429tfn4f2	OWNER	2025-09-20 11:56:52.076	2025-09-20 11:56:52.076
\.


--
-- Data for Name: UserProperty; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserProperty" (id, "userId", "propertyId", role, "createdAt", "updatedAt", shift) FROM stdin;
cmfs7qxtg000znjk44eoq531c	cmfs7qxq7000bnjk4f5t8gz0v	cmfs7qxle0002njk44p5cacb3	PROPERTY_MGR	2025-09-20 11:56:52.276	2025-09-20 11:56:52.276	\N
cmfs7qxtg0012njk48v9d4ntr	cmfs7qxt0000qnjk4o3r8gfyt	cmfs7qxle0002njk44p5cacb3	HOUSEKEEPING	2025-09-20 11:56:52.276	2025-09-20 11:56:52.276	\N
cmfs7qxtg0014njk4h8tzw99q	cmfs7qxt0000qnjk4o3r8gfyt	cmfs7qxmx0004njk4nej4quv2	HOUSEKEEPING	2025-09-20 11:56:52.277	2025-09-20 11:56:52.277	\N
cmfs7qxtg0013njk42zbr5fg6	cmfs7qxqr000enjk47i0vadr5	cmfs7qxle0002njk44p5cacb3	FRONT_DESK	2025-09-20 11:56:52.276	2025-09-20 11:56:52.276	\N
cmfs7qxtg0015njk4euf5oubj	cmfs7qxr9000hnjk43vznsrhq	cmfs7qxmx0004njk4nej4quv2	MAINTENANCE	2025-09-20 11:56:52.277	2025-09-20 11:56:52.277	\N
\.


--
-- Data for Name: WebhookEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."WebhookEvent" (id, "stripeEventId", "eventType", "processedAt", data, error, "createdAt") FROM stdin;
\.


--
-- Data for Name: _RoomAmenities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_RoomAmenities" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3cdf1cfa-2ae8-45da-aa46-9558f4b3ee81	3f7604fe12b77f13dc62c61b337d6dae75372bed18d717e68588e8ac6b735889	2025-09-20 17:26:46.435756+05:30	20250914_baseline	\N	\N	2025-09-20 17:26:46.204481+05:30	1
\.


--
-- Name: Amenity Amenity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Amenity"
    ADD CONSTRAINT "Amenity_pkey" PRIMARY KEY (id);


--
-- Name: Channel Channel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Channel"
    ADD CONSTRAINT "Channel_pkey" PRIMARY KEY (id);


--
-- Name: DailyRate DailyRate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DailyRate"
    ADD CONSTRAINT "DailyRate_pkey" PRIMARY KEY (id);


--
-- Name: Favorite Favorite_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_pkey" PRIMARY KEY (id);


--
-- Name: InvitationToken InvitationToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvitationToken"
    ADD CONSTRAINT "InvitationToken_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: PaymentMethod PaymentMethod_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY (id);


--
-- Name: PaymentTransaction PaymentTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PropertySettings PropertySettings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PropertySettings"
    ADD CONSTRAINT "PropertySettings_pkey" PRIMARY KEY (id);


--
-- Name: Property Property_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Property"
    ADD CONSTRAINT "Property_pkey" PRIMARY KEY (id);


--
-- Name: RateChangeLog RateChangeLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RateChangeLog"
    ADD CONSTRAINT "RateChangeLog_pkey" PRIMARY KEY (id);


--
-- Name: Refund Refund_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Refund"
    ADD CONSTRAINT "Refund_pkey" PRIMARY KEY (id);


--
-- Name: Reservation Reservation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_pkey" PRIMARY KEY (id);


--
-- Name: RoomImage RoomImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoomImage"
    ADD CONSTRAINT "RoomImage_pkey" PRIMARY KEY (id);


--
-- Name: RoomPricing RoomPricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoomPricing"
    ADD CONSTRAINT "RoomPricing_pkey" PRIMARY KEY (id);


--
-- Name: RoomType RoomType_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoomType"
    ADD CONSTRAINT "RoomType_pkey" PRIMARY KEY (id);


--
-- Name: Room Room_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_pkey" PRIMARY KEY (id);


--
-- Name: SeasonalRate SeasonalRate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SeasonalRate"
    ADD CONSTRAINT "SeasonalRate_pkey" PRIMARY KEY (id);


--
-- Name: UserOrg UserOrg_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserOrg"
    ADD CONSTRAINT "UserOrg_pkey" PRIMARY KEY (id);


--
-- Name: UserProperty UserProperty_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserProperty"
    ADD CONSTRAINT "UserProperty_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WebhookEvent WebhookEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WebhookEvent"
    ADD CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY (id);


--
-- Name: _RoomAmenities _RoomAmenities_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_RoomAmenities"
    ADD CONSTRAINT "_RoomAmenities_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Amenity_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Amenity_name_key" ON public."Amenity" USING btree (name);


--
-- Name: Channel_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Channel_organizationId_idx" ON public."Channel" USING btree ("organizationId");


--
-- Name: DailyRate_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DailyRate_date_idx" ON public."DailyRate" USING btree (date);


--
-- Name: DailyRate_roomTypeId_date_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DailyRate_roomTypeId_date_key" ON public."DailyRate" USING btree ("roomTypeId", date);


--
-- Name: DailyRate_roomTypeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DailyRate_roomTypeId_idx" ON public."DailyRate" USING btree ("roomTypeId");


--
-- Name: Favorite_roomId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Favorite_roomId_idx" ON public."Favorite" USING btree ("roomId");


--
-- Name: Favorite_userId_roomId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Favorite_userId_roomId_key" ON public."Favorite" USING btree ("userId", "roomId");


--
-- Name: InvitationToken_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvitationToken_email_idx" ON public."InvitationToken" USING btree (email);


--
-- Name: InvitationToken_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvitationToken_organizationId_idx" ON public."InvitationToken" USING btree ("organizationId");


--
-- Name: InvitationToken_propertyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvitationToken_propertyId_idx" ON public."InvitationToken" USING btree ("propertyId");


--
-- Name: InvitationToken_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "InvitationToken_token_idx" ON public."InvitationToken" USING btree (token);


--
-- Name: InvitationToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "InvitationToken_token_key" ON public."InvitationToken" USING btree (token);


--
-- Name: Organization_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Organization_domain_idx" ON public."Organization" USING btree (domain);


--
-- Name: Organization_domain_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Organization_domain_key" ON public."Organization" USING btree (domain);


--
-- Name: Organization_stripeAccountId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Organization_stripeAccountId_idx" ON public."Organization" USING btree ("stripeAccountId");


--
-- Name: PaymentMethod_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentMethod_customerId_idx" ON public."PaymentMethod" USING btree ("customerId");


--
-- Name: PaymentMethod_stripePaymentMethodId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON public."PaymentMethod" USING btree ("stripePaymentMethodId");


--
-- Name: PaymentTransaction_reservationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentTransaction_reservationId_idx" ON public."PaymentTransaction" USING btree ("reservationId");


--
-- Name: PaymentTransaction_reservationId_stripePaymentIntentId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PaymentTransaction_reservationId_stripePaymentIntentId_key" ON public."PaymentTransaction" USING btree ("reservationId", "stripePaymentIntentId");


--
-- Name: PaymentTransaction_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentTransaction_status_idx" ON public."PaymentTransaction" USING btree (status);


--
-- Name: PaymentTransaction_stripePaymentIntentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentTransaction_stripePaymentIntentId_idx" ON public."PaymentTransaction" USING btree ("stripePaymentIntentId");


--
-- Name: PaymentTransaction_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PaymentTransaction_type_idx" ON public."PaymentTransaction" USING btree (type);


--
-- Name: Payment_reservationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_reservationId_idx" ON public."Payment" USING btree ("reservationId");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Payment_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_type_idx" ON public."Payment" USING btree (type);


--
-- Name: PropertySettings_orgId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PropertySettings_orgId_idx" ON public."PropertySettings" USING btree ("orgId");


--
-- Name: PropertySettings_orgId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PropertySettings_orgId_key" ON public."PropertySettings" USING btree ("orgId");


--
-- Name: PropertySettings_propertyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PropertySettings_propertyId_idx" ON public."PropertySettings" USING btree ("propertyId");


--
-- Name: PropertySettings_propertyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PropertySettings_propertyId_key" ON public."PropertySettings" USING btree ("propertyId");


--
-- Name: Property_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Property_organizationId_idx" ON public."Property" USING btree ("organizationId");


--
-- Name: Property_organizationId_isDefault_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Property_organizationId_isDefault_idx" ON public."Property" USING btree ("organizationId", "isDefault");


--
-- Name: Property_organizationId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Property_organizationId_name_key" ON public."Property" USING btree ("organizationId", name);


--
-- Name: RateChangeLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RateChangeLog_createdAt_idx" ON public."RateChangeLog" USING btree ("createdAt");


--
-- Name: RateChangeLog_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RateChangeLog_date_idx" ON public."RateChangeLog" USING btree (date);


--
-- Name: RateChangeLog_roomTypeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RateChangeLog_roomTypeId_idx" ON public."RateChangeLog" USING btree ("roomTypeId");


--
-- Name: Refund_reservationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Refund_reservationId_idx" ON public."Refund" USING btree ("reservationId");


--
-- Name: Refund_stripeRefundId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON public."Refund" USING btree ("stripeRefundId");


--
-- Name: Reservation_channelId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reservation_channelId_idx" ON public."Reservation" USING btree ("channelId");


--
-- Name: Reservation_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reservation_organizationId_idx" ON public."Reservation" USING btree ("organizationId");


--
-- Name: Reservation_propertyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reservation_propertyId_idx" ON public."Reservation" USING btree ("propertyId");


--
-- Name: Reservation_roomId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reservation_roomId_idx" ON public."Reservation" USING btree ("roomId");


--
-- Name: Reservation_stripePaymentIntentId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Reservation_stripePaymentIntentId_key" ON public."Reservation" USING btree ("stripePaymentIntentId");


--
-- Name: Reservation_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Reservation_userId_idx" ON public."Reservation" USING btree ("userId");


--
-- Name: RoomPricing_roomId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RoomPricing_roomId_key" ON public."RoomPricing" USING btree ("roomId");


--
-- Name: RoomType_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RoomType_organizationId_idx" ON public."RoomType" USING btree ("organizationId");


--
-- Name: RoomType_organizationId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RoomType_organizationId_name_key" ON public."RoomType" USING btree ("organizationId", name);


--
-- Name: RoomType_propertyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RoomType_propertyId_idx" ON public."RoomType" USING btree ("propertyId");


--
-- Name: Room_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Room_organizationId_idx" ON public."Room" USING btree ("organizationId");


--
-- Name: Room_propertyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Room_propertyId_idx" ON public."Room" USING btree ("propertyId");


--
-- Name: SeasonalRate_roomTypeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SeasonalRate_roomTypeId_idx" ON public."SeasonalRate" USING btree ("roomTypeId");


--
-- Name: SeasonalRate_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SeasonalRate_startDate_endDate_idx" ON public."SeasonalRate" USING btree ("startDate", "endDate");


--
-- Name: UserOrg_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserOrg_organizationId_idx" ON public."UserOrg" USING btree ("organizationId");


--
-- Name: UserOrg_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserOrg_userId_idx" ON public."UserOrg" USING btree ("userId");


--
-- Name: UserOrg_userId_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UserOrg_userId_organizationId_key" ON public."UserOrg" USING btree ("userId", "organizationId");


--
-- Name: UserProperty_propertyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserProperty_propertyId_idx" ON public."UserProperty" USING btree ("propertyId");


--
-- Name: UserProperty_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserProperty_userId_idx" ON public."UserProperty" USING btree ("userId");


--
-- Name: UserProperty_userId_propertyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UserProperty_userId_propertyId_key" ON public."UserProperty" USING btree ("userId", "propertyId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: WebhookEvent_eventType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "WebhookEvent_eventType_idx" ON public."WebhookEvent" USING btree ("eventType");


--
-- Name: WebhookEvent_processedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "WebhookEvent_processedAt_idx" ON public."WebhookEvent" USING btree ("processedAt");


--
-- Name: WebhookEvent_stripeEventId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON public."WebhookEvent" USING btree ("stripeEventId");


--
-- Name: _RoomAmenities_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_RoomAmenities_B_index" ON public."_RoomAmenities" USING btree ("B");


--
-- Name: Channel Channel_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Channel"
    ADD CONSTRAINT "Channel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DailyRate DailyRate_pricingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DailyRate"
    ADD CONSTRAINT "DailyRate_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES public."RoomPricing"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DailyRate DailyRate_roomTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DailyRate"
    ADD CONSTRAINT "DailyRate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES public."RoomType"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favorite Favorite_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Favorite Favorite_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InvitationToken InvitationToken_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvitationToken"
    ADD CONSTRAINT "InvitationToken_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InvitationToken InvitationToken_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvitationToken"
    ADD CONSTRAINT "InvitationToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InvitationToken InvitationToken_propertyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InvitationToken"
    ADD CONSTRAINT "InvitationToken_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES public."Property"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentTransaction PaymentTransaction_reservationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES public."Reservation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_paymentMethodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES public."PaymentMethod"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_reservationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES public."Reservation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PropertySettings PropertySettings_propertyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PropertySettings"
    ADD CONSTRAINT "PropertySettings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES public."Property"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Property Property_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Property"
    ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RateChangeLog RateChangeLog_roomTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RateChangeLog"
    ADD CONSTRAINT "RateChangeLog_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES public."RoomType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RateChangeLog RateChangeLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RateChangeLog"
    ADD CONSTRAINT "RateChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Refund Refund_reservationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Refund"
    ADD CONSTRAINT "Refund_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES public."Reservation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reservation Reservation_channelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."Channel"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reservation Reservation_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reservation Reservation_propertyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES public."Property"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reservation Reservation_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reservation Reservation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RoomImage RoomImage_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoomImage"
    ADD CONSTRAINT "RoomImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RoomPricing RoomPricing_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoomPricing"
    ADD CONSTRAINT "RoomPricing_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RoomType RoomType_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoomType"
    ADD CONSTRAINT "RoomType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RoomType RoomType_propertyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoomType"
    ADD CONSTRAINT "RoomType_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES public."Property"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Room Room_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Room Room_propertyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES public."Property"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Room Room_roomTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES public."RoomType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SeasonalRate SeasonalRate_pricingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SeasonalRate"
    ADD CONSTRAINT "SeasonalRate_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES public."RoomPricing"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SeasonalRate SeasonalRate_roomTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SeasonalRate"
    ADD CONSTRAINT "SeasonalRate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES public."RoomType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserOrg UserOrg_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserOrg"
    ADD CONSTRAINT "UserOrg_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserOrg UserOrg_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserOrg"
    ADD CONSTRAINT "UserOrg_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserProperty UserProperty_propertyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserProperty"
    ADD CONSTRAINT "UserProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES public."Property"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserProperty UserProperty_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserProperty"
    ADD CONSTRAINT "UserProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: _RoomAmenities _RoomAmenities_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_RoomAmenities"
    ADD CONSTRAINT "_RoomAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES public."Amenity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _RoomAmenities _RoomAmenities_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_RoomAmenities"
    ADD CONSTRAINT "_RoomAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--


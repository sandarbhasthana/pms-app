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
cmdxgl1y40000njro20dr1kib	Grand Palace Hotel	example.com	2025-08-04 18:43:40.444	2025-09-14 11:07:59.127	acct_1S6wvDD6wJFaDDpR	f	f
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "reservationId", type, method, status, amount, currency, "gatewayTxId", notes, "createdAt", description, "paymentMethodId", "processedAt") FROM stdin;
cmfprt0bq0003nj5gslkpavs5	cmfprt0b70001nj5g0peampad	payment	card	COMPLETED	15000	INR	\N	\N	2025-09-18 18:55:02.63	Payment for reservation cmfprt0b70001nj5g0peampad	\N	2025-09-18 18:55:02.628
cmfptbja7000enj5gdyk9t11y	cmfptbj9m000bnj5gls06vwlx	payment	card	COMPLETED	2200	INR	\N	\N	2025-09-18 19:37:26.624	Payment for reservation cmfptbj9m000bnj5gls06vwlx	cmfptbja2000cnj5gc4kb2ar0	2025-09-18 19:37:26.622
cmfptm17b000jnj5gsl2ugcox	cmfptm16j000gnj5govipd2lt	payment	card	COMPLETED	2200	INR	\N	\N	2025-09-18 19:45:36.407	Payment for reservation cmfptm16j000gnj5govipd2lt	cmfptm174000hnj5gpr640k5q	2025-09-18 19:45:36.405
cmfpxz48m0004njps92ylvz6x	cmfpxz47v0001njpsp334ru4h	payment	card	COMPLETED	30000	INR	\N	\N	2025-09-18 21:47:45.334	Payment for reservation cmfpxz47v0001njpsp334ru4h	cmfpxz48e0002njps9eu0rd91	2025-09-18 21:47:45.332
\.


--
-- Data for Name: PaymentMethod; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaymentMethod" (id, "customerId", "stripePaymentMethodId", type, "cardBrand", "cardLast4", "cardExpMonth", "cardExpYear", "isDefault", "createdAt") FROM stdin;
cmfptbja2000cnj5gc4kb2ar0	John Doe	pi_3S8ndwDpld3oaqFN0ZliO6Qw	card	card	****	0	0	t	2025-09-18 19:37:26.618
cmfptm174000hnj5gpr640k5q	Ritika Dhamija	pi_3S8nlsDpld3oaqFN160LE57e	card	card	****	0	0	t	2025-09-18 19:45:36.401
cmfpxz48e0002njps9eu0rd91	Miti Kahler	pi_3S8pfsDpld3oaqFN0u2ykwTp	card	card	****	0	0	t	2025-09-18 21:47:45.326
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
cmdxgl1zq0004njrorsqb3mzv	cmdxgl1y40000njro20dr1kib	Grand Palace Beach Resort	456 Ocean Drive, 129, Mauston, Wisconsin 43212, United States	15550456	beach@grandpalace.com	UTC	USD	t	2025-08-04 18:43:40.448	2025-08-28 15:29:24.701	f
cmdxgl1y80002njrof7w48ndg	cmdxgl1y40000njro20dr1kib	Grand Palace Hotel	Bellapine Blvd, A/142, A-Block, Adelanto, California, 94130, United States	15550123	main@grandpalace.com	UTC	USD	t	2025-08-04 18:43:40.448	2025-09-01 17:08:30.127	t
\.


--
-- Data for Name: PropertySettings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PropertySettings" (id, "orgId", "propertyType", "propertyName", "propertyPhone", "propertyEmail", "propertyWebsite", "firstName", "lastName", country, street, suite, city, state, zip, latitude, longitude, "isManuallyPositioned", photos, "printHeader", "printHeaderImage", description, "createdAt", "updatedAt", "propertyId") FROM stdin;
cmdrvyp3v0000njkko4x0y71f	cmazm8w250000njy8n68li3vh	resort	Seahorse Inn	919772862541	ssv_1_12@yahoo.com	https://www.ahirhospitality.com	Shailendra	Verma	India	Gali No-9, Chander Vihar, IP Extension	A-85, 302	East Delhi	Delhi	110092	28.634138	77.29906500000001	f	["https://pms-app-updated.s3.eu-north-1.amazonaws.com/cmdxgl1y40000njro20dr1kib/uploads/1754514515674_backiee-67963.jpg"]	\N		"{\\"type\\":\\"doc\\",\\"content\\":[{\\"type\\":\\"paragraph\\",\\"attrs\\":{\\"textAlign\\":null},\\"content\\":[{\\"type\\":\\"text\\",\\"marks\\":[{\\"type\\":\\"bold\\"}],\\"text\\":\\"Thi\\"},{\\"type\\":\\"text\\",\\"text\\":\\"s is test\\"}]}]}"	2025-07-31 21:07:34.171	2025-08-06 21:08:37.396	\N
cmefv96o60000nj44bfct41ou	cmdxgl1y40000njro20dr1kib	hotel	Seahorse Inn	16541234567	abc@example.com		Edin	Roseberg	India	Lane No-9, Chander Vihar, IP Extension, Patparganj	A-85	East Delhi	Delhi	110092	28.63316774197341	77.29877723013306	t	["https://pms-app-updated.s3.eu-north-1.amazonaws.com/cmdxgl1y40000njro20dr1kib/uploads/1755446050539_PMS.webp"]	\N		"{\\"type\\":\\"doc\\",\\"content\\":[{\\"type\\":\\"paragraph\\",\\"attrs\\":{\\"textAlign\\":null},\\"content\\":[{\\"type\\":\\"text\\",\\"text\\":\\"This is a nice sub-urban property.\\"}]}]}"	2025-08-17 15:54:12.102	2025-08-17 15:54:12.102	\N
cmesv9g3z000bnjzw232hhdwb	\N	hotel	Seahorse Inn	16541234567	abc@example.com		Edin	Roseberg	India	Lane No-9, Chander Vihar, IP Extension, Patparganj	A-85, 301	East Delhi	Delhi	110092	28.63316774197341	77.29877723013306	t	[]	\N		"{\\"type\\":\\"doc\\",\\"content\\":[{\\"type\\":\\"paragraph\\",\\"attrs\\":{\\"textAlign\\":null},\\"content\\":[{\\"type\\":\\"text\\",\\"text\\":\\"This is a nice sub-urban property.\\"}]}]}"	2025-08-26 18:15:24.623	2025-08-26 18:56:00.572	\N
cmesxa1a50003njkk27h157xw	\N	hotel	Seahorse Inn	16541234567	abc@example.com		Edin	Roseberg	India	Lane No-9, Chander Vihar, IP Extension, Patparganj	A-85	East Delhi	Delhi	110092	28.63316774197341	77.29877723013306	t	[]	\N		"{\\"type\\":\\"doc\\",\\"content\\":[{\\"type\\":\\"paragraph\\",\\"attrs\\":{\\"textAlign\\":null},\\"content\\":[{\\"type\\":\\"text\\",\\"text\\":\\"This is a nice sub-urban property.\\"}]}]}"	2025-08-26 19:11:51.293	2025-08-26 19:11:51.293	\N
cmesy4rf7000bnjkkcj2eixmy	\N	resort	Grand Palace Beach Resort	15550456	beach@grandpalace.com		Deborah	Wance	United States	456 Ocean Drive	129	Mauston	Wisconsin	43212	43.7971946	-90.0773495	f	[]	\N		{"type": "doc", "content": [{"type": "paragraph", "content": []}]}	2025-08-26 19:35:44.851	2025-08-26 19:35:44.851	cmdxgl1zq0004njrorsqb3mzv
cmevkb7b20005njzgxyehtaby	\N	lodge	Hilltop Inn	919772862541	xyz@example.com		Rohit	Agarwal	India	Lane No-9, Chander Vihar	A-85, 302, 3F	East Delhi	Delhi	110092	28.63306415755364	77.29888451849365	t	[]	\N		"{\\"type\\":\\"doc\\",\\"content\\":[{\\"type\\":\\"paragraph\\",\\"attrs\\":{\\"textAlign\\":null},\\"content\\":[{\\"type\\":\\"text\\",\\"text\\":\\"This is test\\"}]}]}"	2025-08-28 15:32:09.278	2025-08-28 15:40:46.452	\N
cmesxxoo20005njkkh5pcjwta	\N	hotel	Grand Palace Hotel	15550123	main@grandpalace.com		Mira	Sharma	United States	Bellapine Blvd	A/142, A-Block	Adelanto	California	94130	34.4928571	-117.4014519	f	["https://pms-app-updated.s3.eu-north-1.amazonaws.com/cmdxgl1y40000njro20dr1kib/uploads/1756746507684_PMS.webp"]	\N		"{\\"type\\":\\"doc\\",\\"content\\":[{\\"type\\":\\"paragraph\\",\\"attrs\\":{\\"textAlign\\":null},\\"content\\":[{\\"type\\":\\"text\\",\\"text\\":\\"THis is \\"},{\\"type\\":\\"text\\",\\"marks\\":[{\\"type\\":\\"bold\\"},{\\"type\\":\\"italic\\"},{\\"type\\":\\"underline\\"}],\\"text\\":\\"te\\"}]}]}"	2025-08-26 19:30:14.646	2025-09-01 17:08:30.298	cmdxgl1y80002njrof7w48ndg
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
cme0gld9p0001njmo3ejbf0qp	cmdxgl1y40000njro20dr1kib	cmdxgl24k0025njrokc4hybhh	\N	Sumit Bhatia	2025-08-17 00:00:00	2025-08-18 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-06 21:07:13.645	2025-08-06 21:07:13.645	1	0	\N	sumit.bhatia@abc.com		passport		+919772855411	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmeem71x00001njesgpte41jm	cmdxgl1y40000njro20dr1kib	cmdxgl24i0021njromgwzawdn	\N	Ishesh Tyagi	2025-08-22 00:00:00	2025-08-23 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-16 18:52:49.874	2025-08-16 18:53:07.118	1	0		isheshtyagi@gmail.com		passport		+1-123-4567890	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003enjrofuq8o0uj	cmdxgl1y40000njro20dr1kib	cmdxgl24d001unjron7rrdn6n	\N	Guest User	2024-03-22 00:00:00	2024-03-25 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.854	2025-08-04 18:43:40.854	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003vnjrow8dfimp1	cmdxgl1y40000njro20dr1kib	cmdxgl24e001znjrolak9bdke	\N	Guest User	2024-04-12 00:00:00	2024-04-15 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003gnjrokmnbouzf	cmdxgl1y40000njro20dr1kib	cmdxgl24d001knjroylhnczn3	\N	Guest User	2024-03-15 00:00:00	2024-03-18 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.854	2025-08-04 18:43:40.854	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003znjrose7cu4l4	cmdxgl1y40000njro20dr1kib	cmdxgl24m0029njroinxq5tdu	\N	Guest User	2024-04-20 00:00:00	2024-04-23 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmebnt0em0007nj74x5af70g8	cmdxgl1y40000njro20dr1kib	cmdxgl24j0023njrohx7ircgr	\N	Mithila Palkar	2025-08-20 00:00:00	2025-08-21 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-14 17:14:35.471	2025-08-15 09:34:53.434	2	0		amit.kumar@yahoo.com		passport		+1-555-5555555	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003injro8jm8eov8	cmdxgl1y40000njro20dr1kib	cmdxgl24o002bnjroxz2w42r8	\N	Guest User	2024-03-28 00:00:00	2024-03-31 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29j0040njro3yacegcn	cmdxgl1y40000njro20dr1kib	cmdxgl24d001vnjronqcroo2t	\N	Guest User	2024-05-18 00:00:00	2024-05-21 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmebo7xem0009nj744ah0hd0m	cmdxgl1y40000njro20dr1kib	cmdxgl24m0029njroinxq5tdu	\N	Mark Waugh	2025-08-17 00:00:00	2025-08-20 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-14 17:26:11.423	2025-08-16 15:45:16.982	2	0		mark.waugh@gmail.com		passport		+1-123-4567890	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29j0041njro3gsnfugs	cmdxgl1y40000njro20dr1kib	cmdxgl24i0021njromgwzawdn	\N	Guest User	2024-06-22 00:00:00	2024-06-25 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003snjrodx5p6yex	cmdxgl1y40000njro20dr1kib	cmdxgl24j0023njrohx7ircgr	\N	Guest User	2024-05-10 00:00:00	2024-05-13 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003wnjrosqamy42t	cmdxgl1y40000njro20dr1kib	cmdxgl27u002lnjron2614m42	\N	Guest User	2024-05-25 00:00:00	2024-05-28 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003ynjrom903ofgb	cmdxgl1y40000njro20dr1kib	cmdxgl294002tnjroaqqpqe3w	\N	Guest User	2024-06-15 00:00:00	2024-06-18 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003qnjrodqd8vn5j	cmdxgl1y40000njro20dr1kib	cmdxgl24k0025njrokc4hybhh	\N	Guest User	2024-04-05 00:00:00	2024-04-08 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29i003xnjrofk8ygqku	cmdxgl1y40000njro20dr1kib	cmdxgl24d001lnjrook6khcbs	\N	Guest User	2024-06-08 00:00:00	2024-06-11 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29j0042njroohpqmkys	cmdxgl1y40000njro20dr1kib	cmdxgl24d001onjroniw4en8a	\N	Guest User	2024-07-05 00:00:00	2024-07-08 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29j0043njroc7ihj86x	cmdxgl1y40000njro20dr1kib	cmdxgl27l002jnjro4eofr2tw	\N	Guest User	2024-07-12 00:00:00	2024-07-15 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxgl29j0045njroosxitfi2	cmdxgl1y40000njro20dr1kib	cmdxgl284002nnjroaaxixerd	\N	Guest User	2024-07-20 00:00:00	2024-07-23 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 18:43:40.855	2025-08-04 18:43:40.855	2	0	\N	guest@example.com	\N	\N	\N	+1-555-0199	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmdxkqowu0001njossq51dvwo	cmdxgl1y40000njro20dr1kib	cmdxgl24i0021njromgwzawdn	\N	Sumit Bhatia	2025-08-10 00:00:00	2025-08-13 00:00:00	WEBSITE	\N	CONFIRMED	2025-08-04 20:40:01.95	2025-08-30 16:00:57.22	2	1	\N	sumit.bhatia@abc.com		passport		+919772855411	cmdxgl1zq0004njrorsqb3mzv	\N	5000	\N	\N	\N	requires_payment_method	\N	\N	pi_3S1rDGDpld3oaqFN0ksrbTXU	\N	\N
cmf1dfj3h0001njh8dvlsb7nt	cmdxgl1y40000njro20dr1kib	cmdxgl24m0029njroinxq5tdu	\N	Mukul Verma	2025-09-04 00:00:00	2025-09-05 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-01 17:06:10.92	2025-09-01 17:06:10.92	1	0	\N	mukul.verma@gmail.com		passport		+919990635241	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfbme98s0001njpckh2ifvxu	cmdxgl1y40000njro20dr1kib	cmdxgl24m0029njroinxq5tdu	\N	Ishesh Tyagi	2025-09-11 00:00:00	2025-09-12 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-08 21:14:49.802	2025-09-08 21:14:49.802	2	1	\N	isheshtyagi@gmail.com		passport		+1-123-4567890	cmdxgl1y80002njrof7w48ndg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmfprt0b70001nj5g0peampad	cmdxgl1y40000njro20dr1kib	cmdxgl24m0029njroinxq5tdu	\N	Mithilesh Thakur	2025-09-21 00:00:00	2025-09-22 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-18 18:55:02.609	2025-09-18 18:55:02.609	1	0	\N	mithilesh.thakur@gmail.com		passport		+447887693148	cmdxgl1y80002njrof7w48ndg	1500000	\N	1500000	\N	\N	PAID	\N	\N	\N	\N	\N
cmfptbj9m000bnj5gls06vwlx	cmdxgl1y40000njro20dr1kib	cmdxgl24d001knjroylhnczn3	\N	John Doe	2025-09-22 00:00:00	2025-09-23 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-18 19:37:26.602	2025-09-18 19:37:26.602	1	0	\N	john.doe@gmail.com		passport	India	+919990628408	cmdxgl1y80002njrof7w48ndg	220000	\N	220000	\N	\N	PAID	\N	\N	\N	\N	\N
cmfptm16j000gnj5govipd2lt	cmdxgl1y40000njro20dr1kib	cmdxgl24k0025njrokc4hybhh	\N	Ritika Dhamija	2025-09-23 00:00:00	2025-09-24 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-18 19:45:36.379	2025-09-18 19:45:36.379	1	0	\N	ritika.dhamija@aol.com		passport		+15551234567	cmdxgl1y80002njrof7w48ndg	220000	\N	220000	\N	\N	PAID	\N	\N	\N	\N	\N
cmfpxz47v0001njpsp334ru4h	cmdxgl1y40000njro20dr1kib	cmdxgl24i0021njromgwzawdn	\N	Miti Kahler	2025-09-26 00:00:00	2025-09-29 00:00:00	WEBSITE	\N	CONFIRMED	2025-09-18 21:47:45.307	2025-09-18 21:47:45.307	1	0	\N	mitik@yahoo.com		passport		+918972397890	cmdxgl1y80002njrof7w48ndg	3000000	\N	3000000	\N	\N	PAID	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Room; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Room" (id, "organizationId", name, type, capacity, "createdAt", "updatedAt", "imageUrl", "pricingId", "sizeSqFt", description, "doorlockId", "roomTypeId", "propertyId") FROM stdin;
cmdxgl24e001znjrolak9bdke	cmdxgl1y40000njro20dr1kib	Room 202	Deluxe	2	2025-08-04 18:43:40.669	2025-08-11 20:04:06.907	\N	\N	\N			cmdxgl244001anjrodmuntjn1	cmdxgl1y80002njrof7w48ndg
cmdxgl24d001lnjrook6khcbs	cmdxgl1y40000njro20dr1kib	Room 104	Standard	2	2025-08-04 18:43:40.669	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl24p002dnjroz72vdrzv	cmdxgl1y40000njro20dr1kib	Room 109	Standard	2	2025-08-04 18:43:40.671	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl24m0029njroinxq5tdu	cmdxgl1y40000njro20dr1kib	Presidential Suite 401	Presidential	4	2025-08-04 18:43:40.67	2025-08-06 21:09:24.553	\N	\N	\N			cmdxgl245001dnjrom94y40g3	cmdxgl1y80002njrof7w48ndg
cmdxgl24i0021njromgwzawdn	cmdxgl1y40000njro20dr1kib	Presidential Suite 402	Presidential	4	2025-08-04 18:43:40.67	2025-08-06 21:09:24.553	\N	\N	\N			cmdxgl245001dnjrom94y40g3	cmdxgl1y80002njrof7w48ndg
cmdxgl24j0023njrohx7ircgr	cmdxgl1y40000njro20dr1kib	Room 103	Standard	2	2025-08-04 18:43:40.67	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl24k0025njrokc4hybhh	cmdxgl1y40000njro20dr1kib	Room 102	Standard	2	2025-08-04 18:43:40.67	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl24l0027njro2ynsf6ny	cmdxgl1y40000njro20dr1kib	Room 106	Standard	2	2025-08-04 18:43:40.67	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl24d001unjron7rrdn6n	cmdxgl1y40000njro20dr1kib	Room 201	Deluxe	2	2025-08-04 18:43:40.669	2025-08-11 20:04:06.907	\N	\N	\N			cmdxgl244001anjrodmuntjn1	cmdxgl1y80002njrof7w48ndg
cmdxgl24o002bnjroxz2w42r8	cmdxgl1y40000njro20dr1kib	Suite 301	Suite	2	2025-08-04 18:43:40.669	2025-08-11 20:04:17.341	\N	\N	\N			cmdxgl245001cnjronuijcgif	cmdxgl1y80002njrof7w48ndg
cmdxgl24d001pnjroujylcvz3	cmdxgl1y40000njro20dr1kib	Room 107	Standard	2	2025-08-04 18:43:40.669	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl24d001onjroniw4en8a	cmdxgl1y40000njro20dr1kib	Room 105	Standard	2	2025-08-04 18:43:40.669	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl29b003anjro17na7p86	cmdxgl1y40000njro20dr1kib	Beach Villa 603	Villa	4	2025-08-04 18:43:40.848	2025-08-04 18:43:40.848	\N	\N	\N	\N	\N	cmdxgl249001hnjrofvy97fic	cmdxgl1zq0004njrorsqb3mzv
cmdxgl24d001xnjroysm4f6ic	cmdxgl1y40000njro20dr1kib	Room 108	Standard	2	2025-08-04 18:43:40.669	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl24d001wnjrotugw7tl5	cmdxgl1y40000njro20dr1kib	Room 110	Standard	2	2025-08-04 18:43:40.669	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl24d001vnjronqcroo2t	cmdxgl1y40000njro20dr1kib	Room 203	Deluxe	2	2025-08-04 18:43:40.669	2025-08-11 20:04:06.907	\N	\N	\N			cmdxgl244001anjrodmuntjn1	cmdxgl1y80002njrof7w48ndg
cmdxgl24d001knjroylhnczn3	cmdxgl1y40000njro20dr1kib	Room 101	Standard	2	2025-08-04 18:43:40.669	2025-08-06 21:09:32.466	\N	\N	\N			cmdxgl2440018njroyca9ahqs	cmdxgl1y80002njrof7w48ndg
cmdxgl29b003bnjrojz4n5yrh	cmdxgl1y40000njro20dr1kib	Beach Villa 602	Villa	4	2025-08-04 18:43:40.848	2025-08-04 18:43:40.848	\N	\N	\N	\N	\N	cmdxgl249001hnjrofvy97fic	cmdxgl1zq0004njrorsqb3mzv
cmdxgl269002fnjrocoizdqk4	cmdxgl1y40000njro20dr1kib	Room 207	Deluxe	2	2025-08-04 18:43:40.669	2025-08-11 20:04:06.908	\N	\N	\N			cmdxgl244001anjrodmuntjn1	cmdxgl1y80002njrof7w48ndg
cmdxgl29b0039njrolz2bk339	cmdxgl1y40000njro20dr1kib	Beach Villa 601	Villa	4	2025-08-04 18:43:40.848	2025-08-04 18:43:40.848	\N	\N	\N	\N	\N	cmdxgl249001hnjrofvy97fic	cmdxgl1zq0004njrorsqb3mzv
cmdxgl26t002hnjrodcbu8333	cmdxgl1y40000njro20dr1kib	Room 208	Deluxe	2	2025-08-04 18:43:40.67	2025-08-11 20:04:06.908	\N	\N	\N			cmdxgl244001anjrodmuntjn1	cmdxgl1y80002njrof7w48ndg
cmdxgl29b0035njroc2oal4hw	cmdxgl1y40000njro20dr1kib	Ocean Room 506	Ocean View	2	2025-08-04 18:43:40.848	2025-08-04 18:43:40.848	\N	\N	\N	\N	\N	cmdxgl249001gnjro95z22kpa	cmdxgl1zq0004njrorsqb3mzv
cmdxgl27l002jnjro4eofr2tw	cmdxgl1y40000njro20dr1kib	Room 205	Deluxe	2	2025-08-04 18:43:40.669	2025-08-11 20:04:06.908	\N	\N	\N			cmdxgl244001anjrodmuntjn1	cmdxgl1y80002njrof7w48ndg
cmdxgl29b0034njro7uu72cjx	cmdxgl1y40000njro20dr1kib	Ocean Room 505	Ocean View	2	2025-08-04 18:43:40.848	2025-08-04 18:43:40.848	\N	\N	\N	\N	\N	cmdxgl249001gnjro95z22kpa	cmdxgl1zq0004njrorsqb3mzv
cmdxgl27u002lnjron2614m42	cmdxgl1y40000njro20dr1kib	Suite 302	Suite	2	2025-08-04 18:43:40.669	2025-08-11 20:04:17.341	\N	\N	\N			cmdxgl245001cnjronuijcgif	cmdxgl1y80002njrof7w48ndg
cmdxgl29b0033njro4j9d0526	cmdxgl1y40000njro20dr1kib	Ocean Room 504	Ocean View	2	2025-08-04 18:43:40.847	2025-08-04 18:43:40.847	\N	\N	\N	\N	\N	cmdxgl249001gnjro95z22kpa	cmdxgl1zq0004njrorsqb3mzv
cmdxgl284002nnjroaaxixerd	cmdxgl1y40000njro20dr1kib	Suite 303	Suite	2	2025-08-04 18:43:40.67	2025-08-11 20:04:17.341	\N	\N	\N			cmdxgl245001cnjronuijcgif	cmdxgl1y80002njrof7w48ndg
cmdxgl29b002ynjro3z39vlsr	cmdxgl1y40000njro20dr1kib	Ocean Room 503	Ocean View	2	2025-08-04 18:43:40.847	2025-08-04 18:43:40.847	\N	\N	\N	\N	\N	cmdxgl249001gnjro95z22kpa	cmdxgl1zq0004njrorsqb3mzv
cmdxgl289002pnjro503771v3	cmdxgl1y40000njro20dr1kib	Suite 304	Suite	2	2025-08-04 18:43:40.67	2025-08-11 20:04:17.341	\N	\N	\N			cmdxgl245001cnjronuijcgif	cmdxgl1y80002njrof7w48ndg
cmdxgl29b002znjroevg8sx14	cmdxgl1y40000njro20dr1kib	Ocean Room 502	Ocean View	2	2025-08-04 18:43:40.847	2025-08-04 18:43:40.847	\N	\N	\N	\N	\N	cmdxgl249001gnjro95z22kpa	cmdxgl1zq0004njrorsqb3mzv
cmdxgl28a002rnjrogvkxamro	cmdxgl1y40000njro20dr1kib	Room 206	Deluxe	2	2025-08-04 18:43:40.669	2025-08-11 20:04:06.908	\N	\N	\N			cmdxgl244001anjrodmuntjn1	cmdxgl1y80002njrof7w48ndg
cmdxgl29b002xnjrouupo878v	cmdxgl1y40000njro20dr1kib	Ocean Room 501	Ocean View	2	2025-08-04 18:43:40.847	2025-08-04 18:43:40.847	\N	\N	\N	\N	\N	cmdxgl249001gnjro95z22kpa	cmdxgl1zq0004njrorsqb3mzv
cmdxgl294002tnjroaqqpqe3w	cmdxgl1y40000njro20dr1kib	Room 204	Deluxe	2	2025-08-04 18:43:40.669	2025-08-11 20:04:06.908	\N	\N	\N			cmdxgl244001anjrodmuntjn1	cmdxgl1y80002njrof7w48ndg
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
cme7jjonv0003njzok7hib6lv	cmdxgl1y40000njro20dr1kib	Suite	SUI	private	physical	1	1	0	1	0	\N	{}	{}	\N	{}	2025-08-11 20:04:17.179	2025-08-11 20:04:17.179	\N	\N	f	f	INR	\N	\N	\N	\N	cmdxgl1y80002njrof7w48ndg
cmdxgl244001anjrodmuntjn1	cmdxgl1y40000njro20dr1kib	Deluxe Room	\N	private	physical	2	1	0	1	0	Spacious deluxe room with premium amenities	{}	{}	\N	{}	2025-08-04 18:43:40.661	2025-08-04 18:43:40.661	8	3500	f	f	INR	\N	\N	3200	3800	cmdxgl1y80002njrof7w48ndg
cmdxgl245001dnjrom94y40g3	cmdxgl1y40000njro20dr1kib	Presidential Suite	\N	private	physical	4	1	0	1	0	Ultimate luxury with panoramic views	{}	{}	\N	{}	2025-08-04 18:43:40.661	2025-08-04 18:43:40.661	2	12000	f	f	INR	\N	\N	10000	15000	cmdxgl1y80002njrof7w48ndg
cmdxgl245001cnjronuijcgif	cmdxgl1y40000njro20dr1kib	Executive Suite	\N	private	physical	2	1	0	1	0	Luxury suite with separate living area	{}	{}	\N	{}	2025-08-04 18:43:40.661	2025-08-04 18:43:40.661	4	5500	f	f	INR	\N	\N	5000	6000	cmdxgl1y80002njrof7w48ndg
cmdxgl2440018njroyca9ahqs	cmdxgl1y40000njro20dr1kib	Standard Room	\N	private	physical	2	1	0	1	0	Comfortable standard room with city view	{}	{}	\N	{}	2025-08-04 18:43:40.661	2025-08-04 18:43:40.661	10	2500	f	f	INR	\N	\N	2200	2800	cmdxgl1y80002njrof7w48ndg
cmdxgl249001gnjro95z22kpa	cmdxgl1y40000njro20dr1kib	Ocean View Room	\N	private	physical	2	1	0	1	0	Beautiful room with direct ocean views	{}	{}	\N	{}	2025-08-04 18:43:40.665	2025-08-04 18:43:40.665	6	3000	f	f	INR	\N	\N	2700	3300	cmdxgl1zq0004njrorsqb3mzv
cmdxgl249001hnjrofvy97fic	cmdxgl1y40000njro20dr1kib	Beach Villa	\N	private	physical	4	1	0	1	0	Luxury villa steps from the beach	{}	{}	\N	{}	2025-08-04 18:43:40.665	2025-08-04 18:43:40.665	3	8000	f	f	INR	\N	\N	7000	9000	cmdxgl1zq0004njrorsqb3mzv
cme0go5wj0004njmo9lupv5el	cmdxgl1y40000njro20dr1kib	Presidential	PRE	private	physical	1	1	0	1	0	\N	{}	{}	\N	{}	2025-08-06 21:09:24.068	2025-08-06 21:09:24.068	\N	\N	f	f	INR	\N	\N	\N	\N	cmdxgl1y80002njrof7w48ndg
cme0goc9q0006njmoyfo1veio	cmdxgl1y40000njro20dr1kib	Standard	STD	private	physical	1	1	0	1	0	\N	{}	{}	\N	{}	2025-08-06 21:09:32.318	2025-08-06 21:09:32.318	\N	\N	f	f	INR	\N	\N	\N	\N	cmdxgl1y80002njrof7w48ndg
cme7jjgd20001njzoi6sdw9mx	cmdxgl1y40000njro20dr1kib	Deluxe	DLX	private	physical	1	1	0	1	0	\N	{}	{}	\N	{}	2025-08-11 20:04:06.422	2025-08-11 20:04:06.422	\N	\N	f	f	INR	\N	\N	\N	\N	cmdxgl1y80002njrof7w48ndg
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
cmdxgl1zx0005njroxwuzqtk3	superadmin@example.com	Super Administrator	\N	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51	\N
cmdxgl21x000bnjro97ukmcb2	manager@example.com	John Property Manager	\N	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51	\N
cmdxgl23c000nnjro8ma9f2yb	frontdesk@example.com	Sarah	\N	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51	\N
cmdxgl23i000qnjroh1d6ewoq	owner@example.com	Robert Owner	\N	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51	\N
cmdxgl23l000tnjro0cpu7c4k	it@example.com	Alex IT Support	\N	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51	\N
cmdxgl22w000hnjrol6k5v5xd	accountant@example.com	Lisa Accountant	\N	2025-08-04 18:43:40.51	2025-08-11 20:05:05.042	+919772862541
cmdxgl22b000enjro6keoxcjj	housekeeping@example.com	Maria Housekeeping	\N	2025-08-04 18:43:40.51	2025-08-11 20:05:46.038	+919939783292
cmdxgl23a000knjrodsi93twx	maintenance@example.com	Mike Maintenance	\N	2025-08-04 18:43:40.51	2025-08-11 20:36:34.488	+918972397890
cmdxgl1zx0006njrout0fuib4	admin@example.com	Sandarbh Asthana	\N	2025-08-04 18:43:40.51	2025-08-16 15:47:08.194	\N
cmfim125p0000nj0wo3xu8ma2	sandarbh88@gmail.com	Sandarbh Asthana	\N	2025-09-13 18:38:57.324	2025-09-13 18:38:57.324	+919772862541
cmfk2ty5z000rnj282d3l4wtl	nihit.sharma@gmail.com	Nihit Sharma	\N	2025-09-14 19:17:05.207	2025-09-14 19:17:05.207	+919772862541
\.


--
-- Data for Name: UserOrg; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserOrg" (id, "userId", "organizationId", role, "createdAt", "updatedAt") FROM stdin;
cmdxgl1zx000anjro82r09mdr	cmdxgl1zx0006njrout0fuib4	cmdxgl1y40000njro20dr1kib	ORG_ADMIN	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51
cmdxgl1zx0009njro2a5n4njt	cmdxgl1zx0005njroxwuzqtk3	cmdxgl1y40000njro20dr1kib	SUPER_ADMIN	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51
cmdxgl21x000dnjrocpf5lvru	cmdxgl21x000bnjro97ukmcb2	cmdxgl1y40000njro20dr1kib	PROPERTY_MGR	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51
cmdxgl23c000pnjroyot3lari	cmdxgl23c000nnjro8ma9f2yb	cmdxgl1y40000njro20dr1kib	FRONT_DESK	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51
cmdxgl23i000snjroiv36ypv8	cmdxgl23i000qnjroh1d6ewoq	cmdxgl1y40000njro20dr1kib	OWNER	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51
cmdxgl23l000vnjrorhtmuhfu	cmdxgl23l000tnjro0cpu7c4k	cmdxgl1y40000njro20dr1kib	IT_SUPPORT	2025-08-04 18:43:40.51	2025-08-04 18:43:40.51
cmdxgl22w000jnjrojyj33u8w	cmdxgl22w000hnjrol6k5v5xd	cmdxgl1y40000njro20dr1kib	ACCOUNTANT	2025-08-04 18:43:40.51	2025-08-11 20:05:05.047
cmdxgl22b000gnjroo0p9o6fz	cmdxgl22b000enjro6keoxcjj	cmdxgl1y40000njro20dr1kib	HOUSEKEEPING	2025-08-04 18:43:40.51	2025-08-11 20:05:46.041
cmdxgl23a000mnjro95tb3j1e	cmdxgl23a000knjrodsi93twx	cmdxgl1y40000njro20dr1kib	MAINTENANCE	2025-08-04 18:43:40.51	2025-08-11 20:36:34.496
cmfim12630002nj0wtulpqqr8	cmfim125p0000nj0wo3xu8ma2	cmdxgl1y40000njro20dr1kib	ORG_ADMIN	2025-09-13 18:38:57.339	2025-09-13 18:38:57.339
cmfk2ty69000tnj28az0o4uzp	cmfk2ty5z000rnj282d3l4wtl	cmdxgl1y40000njro20dr1kib	ORG_ADMIN	2025-09-14 19:17:05.217	2025-09-14 19:17:05.217
\.


--
-- Data for Name: UserProperty; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserProperty" (id, "userId", "propertyId", role, "createdAt", "updatedAt", shift) FROM stdin;
cmdxgl23t000xnjro2och7jls	cmdxgl21x000bnjro97ukmcb2	cmdxgl1y80002njrof7w48ndg	PROPERTY_MGR	2025-08-04 18:43:40.65	2025-08-04 18:43:40.65	\N
cmdxgl23t0011njrowcpwfolk	cmdxgl23c000nnjro8ma9f2yb	cmdxgl1y80002njrof7w48ndg	FRONT_DESK	2025-08-04 18:43:40.65	2025-08-04 18:43:40.65	\N
cme7jkpm40004njzow9jfkddu	cmdxgl22w000hnjrol6k5v5xd	cmdxgl1y80002njrof7w48ndg	ACCOUNTANT	2025-08-11 20:05:05.069	2025-08-11 20:05:05.069	MORNING
cme7jll8k0005njzocf1c83p5	cmdxgl22b000enjro6keoxcjj	cmdxgl1zq0004njrorsqb3mzv	HOUSEKEEPING	2025-08-11 20:05:46.052	2025-08-11 20:05:46.052	NIGHT
cme7kp7it0006njzoj1hrw204	cmdxgl23a000knjrodsi93twx	cmdxgl1zq0004njrorsqb3mzv	MAINTENANCE	2025-08-11 20:36:34.517	2025-08-11 20:36:34.517	EVENING
\.


--
-- Data for Name: WebhookEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."WebhookEvent" (id, "stripeEventId", "eventType", "processedAt", data, error, "createdAt") FROM stdin;
cmfjkrcys0000njy0i3ao5jzx	evt_test_1757847070670	account.updated	2025-09-14 10:51:11.33	{"id": "acct_1S6wvDD6wJFaDDpR", "type": "standard", "object": "account", "country": "US", "metadata": {"organizationId": "cmdxgl1y40000njro20dr1kib"}, "requirements": {"past_due": [], "currently_due": [], "eventually_due": [], "pending_verification": []}, "charges_enabled": true, "payouts_enabled": true, "business_profile": {"name": "Test Business", "support_email": "test@example.com"}, "default_currency": "usd", "details_submitted": true}	\N	2025-09-14 10:51:11.332
cmfjlcxvx0001njy0iervj2ww	evt_test_1757848078100	account.updated	2025-09-14 11:07:58.22	{"id": "acct_1S6wvDD6wJFaDDpR", "type": "standard", "object": "account", "country": "US", "metadata": {"organizationId": "cmdxgl1y40000njro20dr1kib"}, "requirements": {"past_due": [], "currently_due": [], "eventually_due": [], "pending_verification": []}, "charges_enabled": true, "payouts_enabled": true, "business_profile": {"name": "Test Business", "support_email": "test@example.com"}, "default_currency": "usd", "details_submitted": true}	\N	2025-09-14 11:07:58.222
cmfjld6lt0002njy04nqcs8fv	evt_test_1757848088974	payment_intent.payment_failed	2025-09-14 11:08:09.519	{"id": "pi_test_1757848088974", "amount": 5000, "object": "payment_intent", "status": "requires_payment_method", "currency": "usd", "metadata": {"type": "reservation_payment", "orgId": "cmdxgl1y40000njro20dr1kib", "propertyId": "prop_test_1757848088974", "reservationId": "res_test_1757848088974"}, "last_payment_error": {"code": "card_declined", "message": "Your card was declined."}}	\N	2025-09-14 11:08:09.521
cmfk19y890000nj28q49ksnpx	evt_test_1757874811928	charge.refunded	2025-09-14 18:33:32.551	{"id": "ch_test_1757874811928", "amount": 5000, "object": "charge", "status": "succeeded", "currency": "usd", "metadata": {"type": "reservation_payment", "orgId": "cmdxgl1y40000njro20dr1kib", "propertyId": "prop_test_1757874811928", "reservationId": "res_test_1757874811928"}, "refunded": true, "payment_intent": "pi_test_1757874811928", "amount_refunded": 2500}	\N	2025-09-14 18:33:32.553
cmfk1yu4s0001nj28e8teg2t2	evt_test_1757875973485	charge.failed	2025-09-14 18:52:53.643	{"id": "ch_test_1757875973485", "amount": 5000, "object": "charge", "status": "failed", "currency": "usd", "metadata": {"type": "reservation_payment", "orgId": "cmdxgl1y40000njro20dr1kib", "propertyId": "prop_test_1757875973485", "reservationId": "res_test_1757875973485"}, "failure_code": "card_declined", "payment_intent": "pi_test_1757875973485", "failure_message": "Your card was declined."}	\N	2025-09-14 18:52:53.644
cmfk1yw3y0002nj28x5do581g	evt_test_1757875976057	charge.succeeded	2025-09-14 18:52:56.205	{"id": "ch_test_1757875976057", "amount": 5000, "object": "charge", "status": "succeeded", "currency": "usd", "metadata": {"type": "reservation_payment", "orgId": "cmdxgl1y40000njro20dr1kib", "propertyId": "prop_test_1757875976057", "reservationId": "res_test_1757875976057"}, "payment_intent": "pi_test_1757875976057"}	\N	2025-09-14 18:52:56.206
cmfk2aas00003nj28vit411fv	evt_3S7LBNDpld3oaqFN0pvYLH6A	charge.succeeded	2025-09-14 19:01:48.431	{"id": "ch_3S7LBNDpld3oaqFN0T8HNlrc", "paid": true, "order": null, "amount": 2000, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1757876514, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "risk_score": 42, "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": false, "metadata": {}, "refunded": false, "shipping": {"name": "Jenny Rosen", "phone": null, "address": {"city": "San Francisco", "line1": "510 Townsend St", "line2": null, "state": "CA", "country": "US", "postal_code": "94103"}, "carrier": null, "tracking_number": null}, "application": null, "description": "(created by Stripe CLI)", "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xQTVybnpEcGxkM29hcUZOKKKinMYGMgZ4rK81yo86LBZ21KMJKBH-or2EJDsATAEbD7T7Nye-pt4ZOjpBq0H8ys3dcydWwUD8kj95", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3S7LBNDpld3oaqFN0xle2yAa", "payment_method": "pm_1S7LBNDpld3oaqFNxaBY97Lf", "receipt_number": null, "transfer_group": null, "amount_captured": 2000, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": null, "email": null, "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": null, "postal_code": null}}, "failure_message": null, "source_transfer": null, "balance_transaction": null, "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "4242", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": null}, "wallet": null, "country": "US", "funding": "credit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 9, "fingerprint": "BZ9kgnnAA8t0ZLDt", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 2000}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 2000, "authorization_code": "823309", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "669057107103110", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "Stripe"}	\N	2025-09-14 19:01:48.433
cmfk2aats0004nj28i8yay9o6	evt_3S7LBNDpld3oaqFN0mem4bgT	payment_intent.succeeded	2025-09-14 19:01:48.495	{"id": "pi_3S7LBNDpld3oaqFN0xle2yAa", "amount": 2000, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1757876513, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": {"name": "Jenny Rosen", "phone": null, "address": {"city": "San Francisco", "line1": "510 Townsend St", "line2": null, "state": "CA", "country": "US", "postal_code": "94103"}, "carrier": null, "tracking_number": null}, "processing": null, "application": null, "canceled_at": null, "description": "(created by Stripe CLI)", "next_action": null, "on_behalf_of": null, "client_secret": "pi_3S7LBNDpld3oaqFN0xle2yAa_secret_o7cKUnyUAjKU45NU8KdaF5dOn", "latest_charge": "ch_3S7LBNDpld3oaqFN0T8HNlrc", "receipt_email": null, "transfer_data": null, "amount_details": {"tip": {}}, "capture_method": "automatic_async", "payment_method": "pm_1S7LBNDpld3oaqFNxaBY97Lf", "transfer_group": null, "amount_received": 2000, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	\N	2025-09-14 19:01:48.497
cmfk2d9bg000anj28dqubm0fr	evt_1S7LDcRlJWTkXyDtoKMVZD8o	account.application.authorized	2025-09-14 19:04:06.507	{"id": "ca_SxfhPQBPcUOCqewk7khoSAsmDkBNHo3g", "name": "PMS", "object": "application"}	\N	2025-09-14 19:04:06.509
cmfk2aay80005nj28jr5tkltm	evt_3S7LBNDpld3oaqFN0DFHEVGp	payment_intent.created	2025-09-14 19:01:48.655	{"id": "pi_3S7LBNDpld3oaqFN0xle2yAa", "amount": 2000, "object": "payment_intent", "review": null, "source": null, "status": "requires_payment_method", "created": 1757876513, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": {"name": "Jenny Rosen", "phone": null, "address": {"city": "San Francisco", "line1": "510 Townsend St", "line2": null, "state": "CA", "country": "US", "postal_code": "94103"}, "carrier": null, "tracking_number": null}, "processing": null, "application": null, "canceled_at": null, "description": "(created by Stripe CLI)", "next_action": null, "on_behalf_of": null, "client_secret": "pi_3S7LBNDpld3oaqFN0xle2yAa_secret_o7cKUnyUAjKU45NU8KdaF5dOn", "latest_charge": null, "receipt_email": null, "transfer_data": null, "amount_details": {"tip": {}}, "capture_method": "automatic_async", "payment_method": null, "transfer_group": null, "amount_received": 0, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	\N	2025-09-14 19:01:48.656
cmfk2acrs0006nj28ti5az9fy	evt_3S7LBNDpld3oaqFN0hNZbcTo	charge.updated	2025-09-14 19:01:51.015	{"id": "ch_3S7LBNDpld3oaqFN0T8HNlrc", "paid": true, "order": null, "amount": 2000, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1757876514, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "risk_score": 42, "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": false, "metadata": {}, "refunded": false, "shipping": {"name": "Jenny Rosen", "phone": null, "address": {"city": "San Francisco", "line1": "510 Townsend St", "line2": null, "state": "CA", "country": "US", "postal_code": "94103"}, "carrier": null, "tracking_number": null}, "application": null, "description": "(created by Stripe CLI)", "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xQTVybnpEcGxkM29hcUZOKKWinMYGMgYtX5-LL_k6LBYNV_4aPFHEqn1aiZHV4_l4S4wk753f5ogMJXV8-vt0dg2chAnw2jgMJx2T", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3S7LBNDpld3oaqFN0xle2yAa", "payment_method": "pm_1S7LBNDpld3oaqFNxaBY97Lf", "receipt_number": null, "transfer_group": null, "amount_captured": 2000, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": null, "email": null, "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": null, "postal_code": null}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3S7LBNDpld3oaqFN0kAF5gSD", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "4242", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": null}, "wallet": null, "country": "US", "funding": "credit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 9, "fingerprint": "BZ9kgnnAA8t0ZLDt", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 2000}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 2000, "authorization_code": "823309", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "669057107103110", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "Stripe"}	\N	2025-09-14 19:01:51.017
cmfk2ases0007nj283zd52he6	evt_3S7LBkDpld3oaqFN4BYcjh2c	charge.failed	2025-09-14 19:02:11.283	{"id": "ch_3S7LBkDpld3oaqFN4dJB6zTN", "paid": false, "order": null, "amount": 100, "object": "charge", "review": null, "source": null, "status": "failed", "created": 1757876536, "dispute": null, "outcome": {"type": "issuer_declined", "reason": "generic_decline", "risk_level": "normal", "risk_score": 12, "advice_code": "try_again_later", "network_status": "declined_by_network", "seller_message": "The bank did not return any further details with this decline.", "network_advice_code": null, "network_decline_code": "01"}, "captured": false, "currency": "usd", "customer": null, "disputed": false, "livemode": false, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": "(created by Stripe CLI)", "destination": null, "receipt_url": null, "failure_code": "card_declined", "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3S7LBkDpld3oaqFN4tRfHTuB", "payment_method": "pm_1S7LBkDpld3oaqFN2s81eTUF", "receipt_number": null, "transfer_group": null, "amount_captured": 0, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": null, "email": null, "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": null, "postal_code": null}}, "failure_message": "Your card was declined.", "source_transfer": null, "balance_transaction": null, "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "0002", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": null}, "wallet": null, "country": "US", "funding": "credit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 9, "fingerprint": "y0q9VEKv6THsuZuP", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 100}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": null, "authorization_code": "119562", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "121481135786697", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "Stripe"}	\N	2025-09-14 19:02:11.285
cmfk2asgp0008nj2843wqd0lr	evt_3S7LBkDpld3oaqFN46Gvz7Xf	payment_intent.created	2025-09-14 19:02:11.352	{"id": "pi_3S7LBkDpld3oaqFN4tRfHTuB", "amount": 100, "object": "payment_intent", "review": null, "source": null, "status": "requires_payment_method", "created": 1757876536, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": "(created by Stripe CLI)", "next_action": null, "on_behalf_of": null, "client_secret": "pi_3S7LBkDpld3oaqFN4tRfHTuB_secret_DrkHilfB8S4b3TZeA5NqYCUmj", "latest_charge": null, "receipt_email": null, "transfer_data": null, "amount_details": {"tip": {}}, "capture_method": "automatic_async", "payment_method": null, "transfer_group": null, "amount_received": 0, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	\N	2025-09-14 19:02:11.353
cmfk2asj60009nj28oubeefb1	evt_3S7LBkDpld3oaqFN4oYbGLz2	payment_intent.payment_failed	2025-09-14 19:02:11.441	{"id": "pi_3S7LBkDpld3oaqFN4tRfHTuB", "amount": 100, "object": "payment_intent", "review": null, "source": null, "status": "requires_payment_method", "created": 1757876536, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": "(created by Stripe CLI)", "next_action": null, "on_behalf_of": null, "client_secret": "pi_3S7LBkDpld3oaqFN4tRfHTuB_secret_DrkHilfB8S4b3TZeA5NqYCUmj", "latest_charge": "ch_3S7LBkDpld3oaqFN4dJB6zTN", "receipt_email": null, "transfer_data": null, "amount_details": {"tip": {}}, "capture_method": "automatic_async", "payment_method": null, "transfer_group": null, "amount_received": 0, "amount_capturable": 0, "last_payment_error": {"code": "card_declined", "type": "card_error", "charge": "ch_3S7LBkDpld3oaqFN4dJB6zTN", "doc_url": "https://stripe.com/docs/error-codes/card-declined", "message": "Your card was declined.", "advice_code": "try_again_later", "decline_code": "generic_decline", "payment_method": {"id": "pm_1S7LBkDpld3oaqFN2s81eTUF", "card": {"brand": "visa", "last4": "0002", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": null}, "wallet": null, "country": "US", "funding": "credit", "exp_year": 2026, "networks": {"available": ["visa"], "preferred": null}, "exp_month": 9, "fingerprint": "y0q9VEKv6THsuZuP", "display_brand": "visa", "generated_from": null, "regulated_status": "unregulated", "three_d_secure_usage": {"supported": true}}, "type": "card", "object": "payment_method", "created": 1757876536, "customer": null, "livemode": false, "metadata": {}, "allow_redisplay": "unspecified", "billing_details": {"name": null, "email": null, "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": null, "postal_code": null}}}, "network_decline_code": "01"}, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	\N	2025-09-14 19:02:11.443
cmfk2d9vz000bnj28kwwljnh1	evt_1S7LDdRlJWTkXyDtP6qVpi7E	account.updated	2025-09-14 19:04:07.245	{"id": "acct_1S7LDaRlJWTkXyDt", "type": "standard", "email": null, "object": "account", "country": "US", "created": 1757876651, "metadata": {"foo": "bar"}, "settings": {"payouts": {"schedule": {"interval": "daily", "delay_days": 2}, "statement_descriptor": null, "debit_negative_balances": true}, "branding": {"icon": null, "logo": null, "primary_color": null, "secondary_color": null}, "invoices": {"default_account_tax_ids": null, "hosted_payment_method_save": "offer"}, "payments": {"statement_descriptor": null, "statement_descriptor_kana": null, "statement_descriptor_kanji": null}, "dashboard": {"timezone": "Etc/UTC", "display_name": null}, "card_issuing": {"tos_acceptance": {"ip": null, "date": null}}, "card_payments": {"decline_on": {"avs_failure": false, "cvc_failure": false}, "statement_descriptor_prefix": null, "statement_descriptor_prefix_kana": null, "statement_descriptor_prefix_kanji": null}, "bacs_debit_payments": {"display_name": null, "service_user_number": null}, "sepa_debit_payments": {}}, "controller": {"fees": {"payer": "account"}, "type": "application", "losses": {"payments": "stripe"}, "is_controller": true, "stripe_dashboard": {"type": "full"}, "requirement_collection": "stripe"}, "capabilities": {}, "requirements": {"errors": [], "past_due": ["business_profile.product_description", "business_profile.support_phone", "business_profile.url", "external_account", "tos_acceptance.date", "tos_acceptance.ip"], "alternatives": [], "currently_due": ["business_profile.product_description", "business_profile.support_phone", "business_profile.url", "external_account", "tos_acceptance.date", "tos_acceptance.ip"], "eventually_due": ["business_profile.product_description", "business_profile.support_phone", "business_profile.url", "external_account", "tos_acceptance.date", "tos_acceptance.ip"], "disabled_reason": "requirements.past_due", "current_deadline": null, "pending_verification": []}, "business_type": null, "tos_acceptance": {"ip": null, "date": null, "user_agent": null}, "charges_enabled": false, "payouts_enabled": false, "business_profile": {"mcc": null, "url": null, "name": null, "support_url": null, "support_email": null, "support_phone": null, "annual_revenue": null, "support_address": null, "product_description": null, "estimated_worker_count": null, "minority_owned_business_designation": null}, "default_currency": "usd", "details_submitted": false, "external_accounts": {"url": "/v1/accounts/acct_1S7LDaRlJWTkXyDt/external_accounts", "data": [], "object": "list", "has_more": false, "total_count": 0}, "future_requirements": {"errors": [], "past_due": [], "alternatives": [], "currently_due": [], "eventually_due": [], "disabled_reason": null, "current_deadline": null, "pending_verification": []}}	\N	2025-09-14 19:04:07.247
cmfk2dpkt000cnj28zueo1lx0	evt_3S7LDxDpld3oaqFN1oGwXlsv	charge.succeeded	2025-09-14 19:04:27.579	{"id": "ch_3S7LDxDpld3oaqFN1YH4ENvl", "paid": true, "order": null, "amount": 100, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1757876673, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "risk_score": 34, "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": false, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": "(created by Stripe CLI)", "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xQTVybnpEcGxkM29hcUZOKMGjnMYGMgZEnKt_D-U6LBZX64yHMBh1b8mq6OQsgnzuGr1bGPZ--Nkb_9QI5yggMvCaz1smIQeND918", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3S7LDxDpld3oaqFN1KaWGjVK", "payment_method": "pm_1S7LDwDpld3oaqFNHU2IzHG9", "receipt_number": null, "transfer_group": null, "amount_captured": 100, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": null, "email": null, "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": null, "postal_code": null}}, "failure_message": null, "source_transfer": null, "balance_transaction": null, "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "4242", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": null}, "wallet": null, "country": "US", "funding": "credit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 9, "fingerprint": "BZ9kgnnAA8t0ZLDt", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 100}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 100, "authorization_code": "928776", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "669057107103110", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "Stripe"}	\N	2025-09-14 19:04:27.581
cmfk2dpnc000dnj28atz5x31k	evt_3S7LDxDpld3oaqFN1CxdLgYI	payment_intent.succeeded	2025-09-14 19:04:27.671	{"id": "pi_3S7LDxDpld3oaqFN1KaWGjVK", "amount": 100, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1757876673, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": "(created by Stripe CLI)", "next_action": null, "on_behalf_of": null, "client_secret": "pi_3S7LDxDpld3oaqFN1KaWGjVK_secret_2H2rUDqr6jubDKCfRUdPJJmWD", "latest_charge": "ch_3S7LDxDpld3oaqFN1YH4ENvl", "receipt_email": null, "transfer_data": null, "amount_details": {"tip": {}}, "capture_method": "automatic_async", "payment_method": "pm_1S7LDwDpld3oaqFNHU2IzHG9", "transfer_group": null, "amount_received": 100, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	\N	2025-09-14 19:04:27.672
cmfk2dpov000enj288ocmgzss	evt_3S7LDxDpld3oaqFN1rQJuRQQ	payment_intent.created	2025-09-14 19:04:27.726	{"id": "pi_3S7LDxDpld3oaqFN1KaWGjVK", "amount": 100, "object": "payment_intent", "review": null, "source": null, "status": "requires_payment_method", "created": 1757876673, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": "(created by Stripe CLI)", "next_action": null, "on_behalf_of": null, "client_secret": "pi_3S7LDxDpld3oaqFN1KaWGjVK_secret_2H2rUDqr6jubDKCfRUdPJJmWD", "latest_charge": null, "receipt_email": null, "transfer_data": null, "amount_details": {"tip": {}}, "capture_method": "automatic_async", "payment_method": null, "transfer_group": null, "amount_received": 0, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	\N	2025-09-14 19:04:27.727
cmfk2dquq000fnj282ho0kgw2	evt_3S7LDxDpld3oaqFN1Ee18ve1	refund.created	2025-09-14 19:04:29.233	{"id": "re_3S7LDxDpld3oaqFN1n9bjbLH", "amount": 100, "charge": "ch_3S7LDxDpld3oaqFN1YH4ENvl", "object": "refund", "reason": null, "status": "succeeded", "created": 1757876674, "currency": "usd", "metadata": {}, "payment_intent": "pi_3S7LDxDpld3oaqFN1KaWGjVK", "receipt_number": null, "transfer_reversal": null, "balance_transaction": "txn_3S7LDxDpld3oaqFN15Rb2z7o", "destination_details": {"card": {"type": "refund", "reference_type": "acquirer_reference_number", "reference_status": "pending"}, "type": "card"}, "source_transfer_reversal": null}	\N	2025-09-14 19:04:29.235
cmfk2dqyx000gnj28048lvhsb	evt_3S7LDxDpld3oaqFN1UDuQ58B	charge.refunded	2025-09-14 19:04:29.384	{"id": "ch_3S7LDxDpld3oaqFN1YH4ENvl", "paid": true, "order": null, "amount": 100, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1757876673, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "risk_score": 34, "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": false, "metadata": {}, "refunded": true, "shipping": null, "application": null, "description": "(created by Stripe CLI)", "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xQTVybnpEcGxkM29hcUZOKMOjnMYGMgbrv-PIYHE6LBavSb6jvZb630gHgaduhWHjTiHo6eBwy4YgAwGm9lrmOXxaJua7IEUA0WQL", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3S7LDxDpld3oaqFN1KaWGjVK", "payment_method": "pm_1S7LDwDpld3oaqFNHU2IzHG9", "receipt_number": null, "transfer_group": null, "amount_captured": 100, "amount_refunded": 100, "application_fee": null, "billing_details": {"name": null, "email": null, "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": null, "postal_code": null}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3S7LDxDpld3oaqFN15ryVpYt", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "4242", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": null}, "wallet": null, "country": "US", "funding": "credit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 9, "fingerprint": "BZ9kgnnAA8t0ZLDt", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 100}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 100, "authorization_code": "928776", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "669057107103110", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "Stripe"}	\N	2025-09-14 19:04:29.386
cmfk2e0tz000hnj28qk09va9y	evt_3S7LDxDpld3oaqFN1cwi0Jzp	refund.updated	2025-09-14 19:04:42.165	{"id": "re_3S7LDxDpld3oaqFN1n9bjbLH", "amount": 100, "charge": "ch_3S7LDxDpld3oaqFN1YH4ENvl", "object": "refund", "reason": null, "status": "succeeded", "created": 1757876674, "currency": "usd", "metadata": {}, "payment_intent": "pi_3S7LDxDpld3oaqFN1KaWGjVK", "receipt_number": null, "transfer_reversal": null, "balance_transaction": "txn_3S7LDxDpld3oaqFN15Rb2z7o", "destination_details": {"card": {"type": "refund", "reference": "9876704712024949", "reference_type": "acquirer_reference_number", "reference_status": "available"}, "type": "card"}, "source_transfer_reversal": null}	\N	2025-09-14 19:04:42.167
cmfk2e0uo000inj28mgqqby45	evt_3S7LDxDpld3oaqFN1M2EJS6g	charge.refund.updated	2025-09-14 19:04:42.191	{"id": "re_3S7LDxDpld3oaqFN1n9bjbLH", "amount": 100, "charge": "ch_3S7LDxDpld3oaqFN1YH4ENvl", "object": "refund", "reason": null, "status": "succeeded", "created": 1757876674, "currency": "usd", "metadata": {}, "payment_intent": "pi_3S7LDxDpld3oaqFN1KaWGjVK", "receipt_number": null, "transfer_reversal": null, "balance_transaction": "txn_3S7LDxDpld3oaqFN15Rb2z7o", "destination_details": {"card": {"type": "refund", "reference": "9876704712024949", "reference_type": "acquirer_reference_number", "reference_status": "available"}, "type": "card"}, "source_transfer_reversal": null}	\N	2025-09-14 19:04:42.193
cmfk2em0r000jnj28x0ebbxu7	evt_1S7LEdRlJWTkXyDtkqtBbFrL	account.updated	2025-09-14 19:05:09.625	{"id": "acct_1S7LDaRlJWTkXyDt", "type": "standard", "email": null, "object": "account", "country": "US", "created": 1757876651, "metadata": {"foo": "bar"}, "settings": {"payouts": {"schedule": {"interval": "daily", "delay_days": 2}, "statement_descriptor": null, "debit_negative_balances": true}, "branding": {"icon": null, "logo": null, "primary_color": null, "secondary_color": null}, "invoices": {"default_account_tax_ids": null, "hosted_payment_method_save": "offer"}, "payments": {"statement_descriptor": null, "statement_descriptor_kana": null, "statement_descriptor_kanji": null}, "dashboard": {"timezone": "Etc/UTC", "display_name": null}, "card_issuing": {"tos_acceptance": {"ip": null, "date": null}}, "card_payments": {"decline_on": {"avs_failure": false, "cvc_failure": false}, "statement_descriptor_prefix": null, "statement_descriptor_prefix_kana": null, "statement_descriptor_prefix_kanji": null}, "bacs_debit_payments": {"display_name": null, "service_user_number": null}, "sepa_debit_payments": {}}, "controller": {"fees": {"payer": "account"}, "type": "application", "losses": {"payments": "stripe"}, "is_controller": true, "stripe_dashboard": {"type": "full"}, "requirement_collection": "stripe"}, "capabilities": {}, "requirements": {"errors": [], "past_due": ["business_profile.product_description", "business_profile.support_phone", "business_profile.url", "external_account", "tos_acceptance.date", "tos_acceptance.ip"], "alternatives": [], "currently_due": ["business_profile.product_description", "business_profile.support_phone", "business_profile.url", "external_account", "tos_acceptance.date", "tos_acceptance.ip"], "eventually_due": ["business_profile.product_description", "business_profile.support_phone", "business_profile.url", "external_account", "tos_acceptance.date", "tos_acceptance.ip"], "disabled_reason": "requirements.past_due", "current_deadline": null, "pending_verification": []}, "business_type": null, "tos_acceptance": {"ip": null, "date": null, "user_agent": null}, "charges_enabled": false, "payouts_enabled": false, "business_profile": {"mcc": null, "url": null, "name": null, "support_url": null, "support_email": null, "support_phone": null, "annual_revenue": null, "support_address": null, "product_description": null, "estimated_worker_count": null, "minority_owned_business_designation": null}, "default_currency": "usd", "details_submitted": false, "external_accounts": {"url": "/v1/accounts/acct_1S7LDaRlJWTkXyDt/external_accounts", "data": [], "object": "list", "has_more": false, "total_count": 0}, "future_requirements": {"errors": [], "past_due": [], "alternatives": [], "currently_due": [], "eventually_due": [], "disabled_reason": null, "current_deadline": null, "pending_verification": []}}	\N	2025-09-14 19:05:09.627
cmfk2erg2000knj28r8qmyf0p	evt_3S7LEkDpld3oaqFN1yQybggm	charge.succeeded	2025-09-14 19:05:16.657	{"id": "ch_3S7LEkDpld3oaqFN1t8bOzdb", "paid": true, "order": null, "amount": 100, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1757876722, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "risk_score": 36, "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": false, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": "(created by Stripe CLI)", "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xQTVybnpEcGxkM29hcUZOKPKjnMYGMgbHuijsIl46LBZJpC0-1j5yQNP0CpztvRH2QCVnrXaQEBrdGQo870h6FRdoWVNNmSRD4YLY", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3S7LEkDpld3oaqFN1fYms0sG", "payment_method": "pm_1S7LEjDpld3oaqFNjEPxY9W6", "receipt_number": null, "transfer_group": null, "amount_captured": 100, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": null, "email": null, "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": null, "postal_code": null}}, "failure_message": null, "source_transfer": null, "balance_transaction": null, "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "4242", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": null}, "wallet": null, "country": "US", "funding": "credit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 9, "fingerprint": "BZ9kgnnAA8t0ZLDt", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 100}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 100, "authorization_code": "969656", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "669057107103110", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "Stripe"}	\N	2025-09-14 19:05:16.659
cmfk2erh8000lnj28qhpnak9p	evt_3S7LEkDpld3oaqFN1fzZpiy0	payment_intent.succeeded	2025-09-14 19:05:16.699	{"id": "pi_3S7LEkDpld3oaqFN1fYms0sG", "amount": 100, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1757876722, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": "(created by Stripe CLI)", "next_action": null, "on_behalf_of": null, "client_secret": "pi_3S7LEkDpld3oaqFN1fYms0sG_secret_pOxr9xlVcusvh5bqapBnsFkbW", "latest_charge": "ch_3S7LEkDpld3oaqFN1t8bOzdb", "receipt_email": null, "transfer_data": null, "amount_details": {"tip": {}}, "capture_method": "automatic_async", "payment_method": "pm_1S7LEjDpld3oaqFNjEPxY9W6", "transfer_group": null, "amount_received": 100, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	\N	2025-09-14 19:05:16.7
cmfk2erit000mnj281hqvajw5	evt_3S7LEkDpld3oaqFN1TOx2obq	payment_intent.created	2025-09-14 19:05:16.756	{"id": "pi_3S7LEkDpld3oaqFN1fYms0sG", "amount": 100, "object": "payment_intent", "review": null, "source": null, "status": "requires_payment_method", "created": 1757876722, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": "(created by Stripe CLI)", "next_action": null, "on_behalf_of": null, "client_secret": "pi_3S7LEkDpld3oaqFN1fYms0sG_secret_pOxr9xlVcusvh5bqapBnsFkbW", "latest_charge": null, "receipt_email": null, "transfer_data": null, "amount_details": {"tip": {}}, "capture_method": "automatic_async", "payment_method": null, "transfer_group": null, "amount_received": 0, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	\N	2025-09-14 19:05:16.757
cmfk2eslc000nnj28xn47i4a7	evt_3S7LEkDpld3oaqFN1aSSatMM	refund.created	2025-09-14 19:05:18.143	{"id": "re_3S7LEkDpld3oaqFN150ADFjz", "amount": 100, "charge": "ch_3S7LEkDpld3oaqFN1t8bOzdb", "object": "refund", "reason": null, "status": "succeeded", "created": 1757876723, "currency": "usd", "metadata": {}, "payment_intent": "pi_3S7LEkDpld3oaqFN1fYms0sG", "receipt_number": null, "transfer_reversal": null, "balance_transaction": "txn_3S7LEkDpld3oaqFN1SqFO3Sx", "destination_details": {"card": {"type": "refund", "reference_type": "acquirer_reference_number", "reference_status": "pending"}, "type": "card"}, "source_transfer_reversal": null}	\N	2025-09-14 19:05:18.145
cmfk2esot000onj28ua5ju5jg	evt_3S7LEkDpld3oaqFN13XAU97n	charge.refunded	2025-09-14 19:05:18.267	{"id": "ch_3S7LEkDpld3oaqFN1t8bOzdb", "paid": true, "order": null, "amount": 100, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1757876722, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "risk_score": 36, "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": false, "metadata": {}, "refunded": true, "shipping": null, "application": null, "description": "(created by Stripe CLI)", "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xQTVybnpEcGxkM29hcUZOKPSjnMYGMgb2pYO5_7M6LBbiRidOweH2UAkXvS8H_58x8o-RFXGYuv1A1H7N-SR19bE4tdfgwsOu0eeS", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3S7LEkDpld3oaqFN1fYms0sG", "payment_method": "pm_1S7LEjDpld3oaqFNjEPxY9W6", "receipt_number": null, "transfer_group": null, "amount_captured": 100, "amount_refunded": 100, "application_fee": null, "billing_details": {"name": null, "email": null, "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": null, "postal_code": null}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3S7LEkDpld3oaqFN1GZXaDPn", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "4242", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": null}, "wallet": null, "country": "US", "funding": "credit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 9, "fingerprint": "BZ9kgnnAA8t0ZLDt", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 100}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 100, "authorization_code": "969656", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "669057107103110", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "Stripe"}	\N	2025-09-14 19:05:18.269
cmfk2eto8000pnj28stwt4blp	evt_3S7LEkDpld3oaqFN1a0YHJkh	refund.updated	2025-09-14 19:05:19.543	{"id": "re_3S7LEkDpld3oaqFN150ADFjz", "amount": 100, "charge": "ch_3S7LEkDpld3oaqFN1t8bOzdb", "object": "refund", "reason": null, "status": "succeeded", "created": 1757876723, "currency": "usd", "metadata": {}, "payment_intent": "pi_3S7LEkDpld3oaqFN1fYms0sG", "receipt_number": null, "transfer_reversal": null, "balance_transaction": "txn_3S7LEkDpld3oaqFN1SqFO3Sx", "destination_details": {"card": {"type": "refund", "reference": "9158531545363777", "reference_type": "acquirer_reference_number", "reference_status": "available"}, "type": "card"}, "source_transfer_reversal": null}	\N	2025-09-14 19:05:19.545
cmfk2etsn000qnj28g1a3g4n3	evt_3S7LEkDpld3oaqFN1hG1pcF2	charge.refund.updated	2025-09-14 19:05:19.701	{"id": "re_3S7LEkDpld3oaqFN150ADFjz", "amount": 100, "charge": "ch_3S7LEkDpld3oaqFN1t8bOzdb", "object": "refund", "reason": null, "status": "succeeded", "created": 1757876723, "currency": "usd", "metadata": {}, "payment_intent": "pi_3S7LEkDpld3oaqFN1fYms0sG", "receipt_number": null, "transfer_reversal": null, "balance_transaction": "txn_3S7LEkDpld3oaqFN1SqFO3Sx", "destination_details": {"card": {"type": "refund", "reference": "9158531545363777", "reference_type": "acquirer_reference_number", "reference_status": "available"}, "type": "card"}, "source_transfer_reversal": null}	\N	2025-09-14 19:05:19.703
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
50631c57-5822-4fab-87e8-343137d526e4	111e87169ffef8a45b517672d63f4afc5f951b9d82d41df78199b2945e17edc0	2025-08-30 19:48:33.340266+05:30	20250830194605_initial_baseline		\N	2025-08-30 19:48:33.340266+05:30	0
e6f71e86-3cf8-4414-ac73-d9758eb6d948	122d743a0403e77ad7e0ed9447f5b8826f2fbdbc55612d936eff004dd13c2eec	2025-09-11 02:05:37.661815+05:30	20250830141906_test_migration_system	\N	\N	2025-09-11 02:05:37.647921+05:30	1
a7176ff9-433d-4146-8a60-7c7975ebb07e	e9853701d6ba6c1018782ce2eef2a3c52dd5233242f5a4d395bbdb7328893762	2025-09-11 02:14:59.461264+05:30	20250110000000_add_missing_payment_columns		\N	2025-09-11 02:14:59.461264+05:30	0
fa862174-7ae4-4371-be65-1f081bb27357	3f7604fe12b77f13dc62c61b337d6dae75372bed18d717e68588e8ac6b735889	2025-09-15 01:52:10.693949+05:30	20250914_baseline		\N	2025-09-15 01:52:10.693949+05:30	0
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


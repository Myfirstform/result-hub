

# SaaS Result Publishing Platform — MVP Plan

## Overview
A multi-tenant platform where institutions publish student exam results, and students look up their results using a register number and secret code. Super admins manage institutions, institution admins manage their own results.

---

## Phase 1: Database & Auth Setup

### Database Tables
- **institutions** — name, slug (unique), logo_url, status (active/suspended), contact info, footer message
- **user_roles** — links Supabase auth users to roles (super_admin, institution_admin)
- **institution_admins** — maps admin users to their institution
- **student_results** — register_number, secret_code (plain text for MVP), student_name, class, subjects (JSONB for dynamic subjects), total, grade, rank, institution_id, published (boolean)
- **access_logs** — institution_id, register_number, searched_at timestamp

### Auth & Roles
- Supabase Auth for super admin and institution admin login
- Role-based access using a `user_roles` table with a `has_role()` security definer function
- RLS policies ensuring institution admins only see their own institution's data
- Super admin bypasses restrictions via role check

---

## Phase 2: Super Admin Dashboard

- **Login page** for admin users
- **Institution management**: Create, edit, delete institutions with name, slug, logo upload, admin email, and active/suspended status
- **Create institution admin accounts** — auto-creates Supabase auth user and assigns role
- **Overview stats**: Total institutions, total results uploaded, total result searches

---

## Phase 3: Institution Admin Panel

- **Login page** (shared with super admin, redirects based on role)
- **Profile section**: View/edit institution name, logo, contact info, footer message
- **Result upload**:
  - Upload CSV/Excel file
  - Client-side parsing with column mapping preview
  - Validate required fields, detect duplicates
  - Bulk insert into Supabase
- **Result management**:
  - View all uploaded results in a searchable table
  - Edit individual student results inline
  - Delete results
  - Toggle result visibility (publish/unpublish)
- **Search logs**: View which register numbers were searched and when

---

## Phase 4: Student Result Page (Public)

- **Path-based routing**: visiting `/darululoom` loads that institution's branded result page
- **Institution branding**: Shows logo, institution name, and custom footer
- **Lookup form**: Register Number + Secret Code input
- **Result display**: Student name, class, dynamic subject-wise marks table, total, grade, rank
- **Print button** for printing the result
- **No login required** — fully public access

---

## Phase 5: Polish & UX

- Mobile-responsive design across all pages
- Loading skeletons during data fetches
- Toast notifications for actions (upload success, errors, etc.)
- Clean, professional UI with consistent styling
- Forgot password flow for admin users

---

## Future Enhancements (Post-MVP)
- PDF download of results
- Dark/light mode toggle
- Secret code hashing & rate limiting
- Scheduled publish date/time
- Enable/disable print per institution
- Per-institution analytics dashboard
- Audit logs for all admin actions
- Upload success email notifications


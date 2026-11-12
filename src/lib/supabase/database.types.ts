export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      universities: {
        Row: {
          id: string;
          code: string;
          name: string;
          short_name: string;
          email_domain: string;
          city: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          code: string;
          name: string;
          short_name: string;
          email_domain: string;
          city?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          short_name?: string;
          email_domain?: string;
          city?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      majors: {
        Row: {
          id: string;
          university_id: string;
          code: string;
          name: string;
          faculty: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          university_id: string;
          code: string;
          name: string;
          faculty: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          university_id?: string;
          code?: string;
          name?: string;
          faculty?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "majors_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          major_id: string;
          code: string;
          name: string;
          semester_hint: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          major_id: string;
          code: string;
          name: string;
          semester_hint?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          major_id?: string;
          code?: string;
          name?: string;
          semester_hint?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_major_id_fkey";
            columns: ["major_id"];
            isOneToOne: false;
            referencedRelation: "majors";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon_name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon_name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          icon_name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      locker_locations: {
        Row: {
          id: string;
          code: string;
          name: string;
          campus_area: string;
          address: string;
          university_id: string;
          operating_hours: string;
          description: string;
          total_compartments: number;
          available_compartments: number;
          is_demo_station: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          code: string;
          name: string;
          campus_area: string;
          address: string;
          university_id: string;
          operating_hours: string;
          description: string;
          total_compartments?: number;
          available_compartments?: number;
          is_demo_station?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          campus_area?: string;
          address?: string;
          university_id?: string;
          operating_hours?: string;
          description?: string;
          total_compartments?: number;
          available_compartments?: number;
          is_demo_station?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locker_locations_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      locker_compartments: {
        Row: {
          id: string;
          locker_id: string;
          code: string;
          size: "S" | "M" | "L";
          size_label: string;
          status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
          current_order_code: string | null;
          current_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          locker_id: string;
          code: string;
          size: "S" | "M" | "L";
          size_label: string;
          status?: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
          current_order_code?: string | null;
          current_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          locker_id?: string;
          code?: string;
          size?: "S" | "M" | "L";
          size_label?: string;
          status?: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
          current_order_code?: string | null;
          current_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locker_compartments_locker_id_fkey";
            columns: ["locker_id"];
            isOneToOne: false;
            referencedRelation: "locker_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          university_id: string;
          major_id: string;
          cohort: string;
          bio: string | null;
          email_verified: boolean;
          campus_verified: boolean;
          rating_avg: number;
          rating_count: number;
          completed_transactions: number;
          eco_points: number;
          role: "student" | "moderator" | "admin";
          account_status: "ACTIVE" | "SUSPENDED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          university_id?: string;
          major_id: string;
          cohort?: string;
          bio?: string | null;
          email_verified?: boolean;
          campus_verified?: boolean;
          rating_avg?: number;
          rating_count?: number;
          completed_transactions?: number;
          eco_points?: number;
          role?: "student" | "moderator" | "admin";
          account_status?: "ACTIVE" | "SUSPENDED";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          university_id?: string;
          major_id?: string;
          cohort?: string;
          bio?: string | null;
          email_verified?: boolean;
          campus_verified?: boolean;
          rating_avg?: number;
          rating_count?: number;
          completed_transactions?: number;
          eco_points?: number;
          role?: "student" | "moderator" | "admin";
          account_status?: "ACTIVE" | "SUSPENDED";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_major_id_fkey";
            columns: ["major_id"];
            isOneToOne: false;
            referencedRelation: "majors";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          slug: string;
          description: string;
          highlights: string[];
          category_id: string;
          condition: "LIKE_NEW" | "GOOD" | "FAIR" | "WELL_USED";
          condition_percent: number;
          price: number;
          original_price: number | null;
          university_id: string;
          major_id: string;
          course_id: string | null;
          cohort: string;
          preferred_locker_id: string | null;
          delivery_method: "SMART_LOCKER" | "CAMPUS_MEETUP";
          status: "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN";
          moderation_note: string | null;
          view_count: number;
          favorite_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          title: string;
          slug: string;
          description: string;
          highlights?: string[];
          category_id: string;
          condition: "LIKE_NEW" | "GOOD" | "FAIR" | "WELL_USED";
          condition_percent?: number;
          price: number;
          original_price?: number | null;
          university_id: string;
          major_id: string;
          course_id?: string | null;
          cohort: string;
          preferred_locker_id?: string | null;
          delivery_method?: "SMART_LOCKER" | "CAMPUS_MEETUP";
          status?: "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN";
          moderation_note?: string | null;
          view_count?: number;
          favorite_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          title?: string;
          slug?: string;
          description?: string;
          highlights?: string[];
          category_id?: string;
          condition?: "LIKE_NEW" | "GOOD" | "FAIR" | "WELL_USED";
          condition_percent?: number;
          price?: number;
          original_price?: number | null;
          university_id?: string;
          major_id?: string;
          course_id?: string | null;
          cohort?: string;
          preferred_locker_id?: string | null;
          delivery_method?: "SMART_LOCKER" | "CAMPUS_MEETUP";
          status?: "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN";
          moderation_note?: string | null;
          view_count?: number;
          favorite_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_major_id_fkey";
            columns: ["major_id"];
            isOneToOne: false;
            referencedRelation: "majors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_preferred_locker_id_fkey";
            columns: ["preferred_locker_id"];
            isOneToOne: false;
            referencedRelation: "locker_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          storage_path: string | null;
          alt_text: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          storage_path?: string | null;
          alt_text: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          storage_path?: string | null;
          alt_text?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          product_id: string;
          locker_location_id: string | null;
          locker_compartment_id: string | null;
          status:
            | "PENDING"
            | "SELLER_CONFIRMED"
            | "AWAITING_DROPOFF"
            | "IN_LOCKER"
            | "READY_FOR_PICKUP"
            | "PICKED_UP"
            | "COMPLETED"
            | "CANCELLED"
            | "EXPIRED"
            | "DISPUTED"
            | "RETURN_PENDING"
            | "RETURNED";
          product_price: number;
          total_amount: number;
          dispute_reason: string | null;
          created_at: string;
          updated_at: string;
          seller_confirmed_at: string | null;
          dropped_off_at: string | null;
          ready_for_pickup_at: string | null;
          picked_up_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          product_id: string;
          locker_location_id?: string | null;
          locker_compartment_id?: string | null;
          status?:
            | "PENDING"
            | "SELLER_CONFIRMED"
            | "AWAITING_DROPOFF"
            | "IN_LOCKER"
            | "READY_FOR_PICKUP"
            | "PICKED_UP"
            | "COMPLETED"
            | "CANCELLED"
            | "EXPIRED"
            | "DISPUTED"
            | "RETURN_PENDING"
            | "RETURNED";
          product_price: number;
          total_amount: number;
          dispute_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          seller_confirmed_at?: string | null;
          dropped_off_at?: string | null;
          ready_for_pickup_at?: string | null;
          picked_up_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          seller_id?: string;
          product_id?: string;
          locker_location_id?: string | null;
          locker_compartment_id?: string | null;
          status?:
            | "PENDING"
            | "SELLER_CONFIRMED"
            | "AWAITING_DROPOFF"
            | "IN_LOCKER"
            | "READY_FOR_PICKUP"
            | "PICKED_UP"
            | "COMPLETED"
            | "CANCELLED"
            | "EXPIRED"
            | "DISPUTED"
            | "RETURN_PENDING"
            | "RETURNED";
          product_price?: number;
          total_amount?: number;
          dispute_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          seller_confirmed_at?: string | null;
          dropped_off_at?: string | null;
          ready_for_pickup_at?: string | null;
          picked_up_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_locker_location_id_fkey";
            columns: ["locker_location_id"];
            isOneToOne: false;
            referencedRelation: "locker_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_locker_compartment_id_fkey";
            columns: ["locker_compartment_id"];
            isOneToOne: false;
            referencedRelation: "locker_compartments";
            referencedColumns: ["id"];
          },
        ];
      };
      order_events: {
        Row: {
          id: string;
          order_id: string;
          actor_id: string | null;
          event_type:
            | "ORDER_CREATED"
            | "SELLER_CONFIRMED"
            | "LOCKER_RESERVED"
            | "ITEM_DROPPED_OFF"
            | "OTP_GENERATED"
            | "OTP_REGENERATED"
            | "LOCKER_UNLOCKED"
            | "ITEM_PICKED_UP"
            | "ORDER_COMPLETED"
            | "ORDER_CANCELLED"
            | "ORDER_EXPIRED"
            | "DISPUTE_OPENED";
          previous_status: string | null;
          new_status: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          actor_id?: string | null;
          event_type:
            | "ORDER_CREATED"
            | "SELLER_CONFIRMED"
            | "LOCKER_RESERVED"
            | "ITEM_DROPPED_OFF"
            | "OTP_GENERATED"
            | "OTP_REGENERATED"
            | "LOCKER_UNLOCKED"
            | "ITEM_PICKED_UP"
            | "ORDER_COMPLETED"
            | "ORDER_CANCELLED"
            | "ORDER_EXPIRED"
            | "DISPUTE_OPENED";
          previous_status?: string | null;
          new_status?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          actor_id?: string | null;
          event_type?:
            | "ORDER_CREATED"
            | "SELLER_CONFIRMED"
            | "LOCKER_RESERVED"
            | "ITEM_DROPPED_OFF"
            | "OTP_GENERATED"
            | "OTP_REGENERATED"
            | "LOCKER_UNLOCKED"
            | "ITEM_PICKED_UP"
            | "ORDER_COMPLETED"
            | "ORDER_CANCELLED"
            | "ORDER_EXPIRED"
            | "DISPUTE_OPENED";
          previous_status?: string | null;
          new_status?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      locker_reservations: {
        Row: {
          id: string;
          order_id: string;
          compartment_id: string;
          reserved_at: string;
          expires_at: string;
          released_at: string | null;
          status: "ACTIVE" | "USED" | "EXPIRED" | "RELEASED";
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          compartment_id: string;
          reserved_at?: string;
          expires_at: string;
          released_at?: string | null;
          status?: "ACTIVE" | "USED" | "EXPIRED" | "RELEASED";
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          compartment_id?: string;
          reserved_at?: string;
          expires_at?: string;
          released_at?: string | null;
          status?: "ACTIVE" | "USED" | "EXPIRED" | "RELEASED";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locker_reservations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "locker_reservations_compartment_id_fkey";
            columns: ["compartment_id"];
            isOneToOne: false;
            referencedRelation: "locker_compartments";
            referencedColumns: ["id"];
          },
        ];
      };
      locker_access_tokens: {
        Row: {
          id: string;
          order_id: string;
          compartment_id: string;
          token_hash: string;
          expires_at: string;
          used_at: string | null;
          attempt_count: number;
          max_attempts: number;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          compartment_id: string;
          token_hash: string;
          expires_at: string;
          used_at?: string | null;
          attempt_count?: number;
          max_attempts?: number;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          compartment_id?: string;
          token_hash?: string;
          expires_at?: string;
          used_at?: string | null;
          attempt_count?: number;
          max_attempts?: number;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locker_access_tokens_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_records: {
        Row: {
          id: string;
          order_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          status: "PENDING" | "HELD_DEMO" | "RELEASED_DEMO" | "REFUNDED_DEMO";
          held_at: string;
          released_at: string | null;
          refunded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          status?: "PENDING" | "HELD_DEMO" | "RELEASED_DEMO" | "REFUNDED_DEMO";
          held_at?: string;
          released_at?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          buyer_id?: string;
          seller_id?: string;
          amount?: number;
          status?: "PENDING" | "HELD_DEMO" | "RELEASED_DEMO" | "REFUNDED_DEMO";
          held_at?: string;
          released_at?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_records_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          product_id: string;
          buyer_id: string;
          seller_id: string;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          buyer_id: string;
          seller_id: string;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          buyer_id?: string;
          seller_id?: string;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          description_accuracy: number;
          product_condition_rating: number;
          transaction_rating: number;
          comment: string | null;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          description_accuracy: number;
          product_condition_rating: number;
          transaction_rating: number;
          comment?: string | null;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          description_accuracy?: number;
          product_condition_rating?: number;
          transaction_rating?: number;
          comment?: string | null;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type:
            | "ORDER_CREATED"
            | "ORDER_CONFIRMED"
            | "LOCKER_RESERVED"
            | "READY_FOR_PICKUP"
            | "OTP_REGENERATED"
            | "ORDER_COMPLETED"
            | "ORDER_CANCELLED"
            | "DISPUTE_OPENED"
            | "DISPUTE_RESOLVED"
            | "NEW_MESSAGE"
            | "NEW_REVIEW"
            | "REPORT_STATUS_CHANGED";
          title: string;
          message: string;
          href: string | null;
          metadata: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type:
            | "ORDER_CREATED"
            | "ORDER_CONFIRMED"
            | "LOCKER_RESERVED"
            | "READY_FOR_PICKUP"
            | "OTP_REGENERATED"
            | "ORDER_COMPLETED"
            | "ORDER_CANCELLED"
            | "DISPUTE_OPENED"
            | "DISPUTE_RESOLVED"
            | "NEW_MESSAGE"
            | "NEW_REVIEW"
            | "REPORT_STATUS_CHANGED";
          title: string;
          message: string;
          href?: string | null;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?:
            | "ORDER_CREATED"
            | "ORDER_CONFIRMED"
            | "LOCKER_RESERVED"
            | "READY_FOR_PICKUP"
            | "OTP_REGENERATED"
            | "ORDER_COMPLETED"
            | "ORDER_CANCELLED"
            | "DISPUTE_OPENED"
            | "DISPUTE_RESOLVED"
            | "NEW_MESSAGE"
            | "NEW_REVIEW"
            | "REPORT_STATUS_CHANGED";
          title?: string;
          message?: string;
          href?: string | null;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "PRODUCT" | "USER" | "MESSAGE";
          target_id: string;
          reason: string;
          description: string | null;
          status: "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";
          reviewed_by: string | null;
          reviewed_at: string | null;
          admin_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: "PRODUCT" | "USER" | "MESSAGE";
          target_id: string;
          reason: string;
          description?: string | null;
          status?: "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          admin_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: "PRODUCT" | "USER" | "MESSAGE";
          target_id?: string;
          reason?: string;
          description?: string | null;
          status?: "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          admin_note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      disputes: {
        Row: {
          id: string;
          order_id: string;
          opened_by: string;
          reason: string;
          description: string | null;
          status:
            | "OPEN"
            | "UNDER_REVIEW"
            | "RESOLVED_BUYER"
            | "RESOLVED_SELLER"
            | "CLOSED";
          resolution: string | null;
          resolved_by: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          opened_by: string;
          reason: string;
          description?: string | null;
          status?:
            | "OPEN"
            | "UNDER_REVIEW"
            | "RESOLVED_BUYER"
            | "RESOLVED_SELLER"
            | "CLOSED";
          resolution?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          opened_by?: string;
          reason?: string;
          description?: string | null;
          status?:
            | "OPEN"
            | "UNDER_REVIEW"
            | "RESOLVED_BUYER"
            | "RESOLVED_SELLER"
            | "CLOSED";
          resolution?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      rpc_expire_order_if_needed: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      rpc_create_order: {
        Args: { p_product_id: string; p_preferred_locker_id?: string | null };
        Returns: Json;
      };
      rpc_seller_confirm_order: {
        Args: { p_order_id: string; p_locker_location_id?: string | null };
        Returns: Json;
      };
      rpc_seller_dropoff: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      rpc_get_buyer_demo_otp: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      rpc_regenerate_locker_otp: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      rpc_verify_locker_otp: {
        Args: { p_order_id: string; p_otp_code: string };
        Returns: Json;
      };
      rpc_confirm_pickup: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      rpc_complete_order: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      rpc_cancel_order: {
        Args: { p_order_id: string; p_reason?: string | null };
        Returns: Json;
      };
      rpc_open_dispute: {
        Args: { p_order_id: string; p_reason: string };
        Returns: Json;
      };
      rpc_get_or_create_conversation: {
        Args: { p_product_id: string };
        Returns: Json;
      };
      rpc_send_message: {
        Args: { p_conversation_id: string; p_content: string };
        Returns: Json;
      };
      rpc_mark_conversation_read: {
        Args: { p_conversation_id: string };
        Returns: Json;
      };
      rpc_submit_review: {
        Args: {
          p_order_id: string;
          p_rating: number;
          p_description_accuracy: number;
          p_product_condition_rating: number;
          p_transaction_rating: number;
          p_comment?: string | null;
        };
        Returns: Json;
      };
      rpc_submit_report: {
        Args: {
          p_target_type: string;
          p_target_id: string;
          p_reason: string;
          p_description?: string | null;
        };
        Returns: Json;
      };
      rpc_admin_review_report: {
        Args: {
          p_report_id: string;
          p_status: string;
          p_admin_note?: string | null;
        };
        Returns: Json;
      };
      rpc_admin_resolve_dispute: {
        Args: {
          p_dispute_id: string;
          p_outcome: string;
          p_resolution_note: string;
        };
        Returns: Json;
      };
      rpc_admin_moderate_product: {
        Args: {
          p_product_id: string;
          p_action: string;
          p_note?: string | null;
        };
        Returns: Json;
      };
      rpc_admin_toggle_compartment_maintenance: {
        Args: { p_compartment_id: string; p_maintenance: boolean };
        Returns: Json;
      };
      rpc_admin_set_user_status: {
        Args: { p_user_id: string; p_status: string };
        Returns: Json;
      };
      rpc_admin_toggle_review_visibility: {
        Args: { p_review_id: string; p_is_hidden: boolean };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

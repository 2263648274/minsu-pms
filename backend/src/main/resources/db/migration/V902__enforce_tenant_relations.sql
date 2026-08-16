-- ============================================================================
-- V902: composite foreign keys prevent cross-tenant object references.
-- ============================================================================

ALTER TABLE `property`
  ADD UNIQUE KEY `uk_property_tenant_id` (`tenant_id`, `id`);

ALTER TABLE `room_type`
  ADD UNIQUE KEY `uk_room_type_tenant_id` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_room_type_property_tenant`
    FOREIGN KEY (`tenant_id`, `property_id`)
    REFERENCES `property` (`tenant_id`, `id`);

ALTER TABLE `room`
  ADD CONSTRAINT `fk_room_property_tenant`
    FOREIGN KEY (`tenant_id`, `property_id`)
    REFERENCES `property` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_room_room_type_tenant`
    FOREIGN KEY (`tenant_id`, `room_type_id`)
    REFERENCES `room_type` (`tenant_id`, `id`);

ALTER TABLE `rate_plan`
  ADD UNIQUE KEY `uk_rate_plan_tenant_id` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_rate_plan_property_tenant`
    FOREIGN KEY (`tenant_id`, `property_id`)
    REFERENCES `property` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_rate_plan_room_type_tenant`
    FOREIGN KEY (`tenant_id`, `room_type_id`)
    REFERENCES `room_type` (`tenant_id`, `id`);

ALTER TABLE `rate_calendar`
  ADD CONSTRAINT `fk_rate_calendar_plan_tenant`
    FOREIGN KEY (`tenant_id`, `rate_plan_id`)
    REFERENCES `rate_plan` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_rate_calendar_room_type_tenant`
    FOREIGN KEY (`tenant_id`, `room_type_id`)
    REFERENCES `room_type` (`tenant_id`, `id`);

ALTER TABLE `inventory`
  ADD CONSTRAINT `fk_inventory_room_type_tenant`
    FOREIGN KEY (`tenant_id`, `room_type_id`)
    REFERENCES `room_type` (`tenant_id`, `id`);

ALTER TABLE `customer`
  ADD UNIQUE KEY `uk_customer_tenant_id` (`tenant_id`, `id`);

ALTER TABLE `booking`
  ADD UNIQUE KEY `uk_booking_tenant_id` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_booking_property_tenant`
    FOREIGN KEY (`tenant_id`, `property_id`)
    REFERENCES `property` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_booking_room_type_tenant`
    FOREIGN KEY (`tenant_id`, `room_type_id`)
    REFERENCES `room_type` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_booking_rate_plan_tenant`
    FOREIGN KEY (`tenant_id`, `rate_plan_id`)
    REFERENCES `rate_plan` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_booking_customer_tenant`
    FOREIGN KEY (`tenant_id`, `customer_id`)
    REFERENCES `customer` (`tenant_id`, `id`);

ALTER TABLE `payment`
  ADD CONSTRAINT `fk_payment_booking_tenant`
    FOREIGN KEY (`tenant_id`, `booking_id`)
    REFERENCES `booking` (`tenant_id`, `id`);

ALTER TABLE `channel`
  ADD UNIQUE KEY `uk_channel_tenant_id` (`tenant_id`, `id`);

ALTER TABLE `channel_room_mapping`
  ADD CONSTRAINT `fk_channel_mapping_channel_tenant`
    FOREIGN KEY (`tenant_id`, `channel_id`)
    REFERENCES `channel` (`tenant_id`, `id`),
  ADD CONSTRAINT `fk_channel_mapping_room_type_tenant`
    FOREIGN KEY (`tenant_id`, `room_type_id`)
    REFERENCES `room_type` (`tenant_id`, `id`);

ALTER TABLE `ota_sync_log`
  ADD CONSTRAINT `fk_ota_sync_log_channel_tenant`
    FOREIGN KEY (`tenant_id`, `channel_id`)
    REFERENCES `channel` (`tenant_id`, `id`);

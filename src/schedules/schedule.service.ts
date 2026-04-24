import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { Schedule } from "./entities/schedule.entity";

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async findByDateRange(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<Schedule[]> {
    return this.scheduleRepository.find({
      where: {
        user_id: userId,
        start_time: Between(start, end),
      },
      order: {
        start_time: "ASC",
        id: "ASC",
      },
    });
  }
}
